"""
Apple Health 数据导入脚本
扫描 GPX_OUT 目录，匹配 JSON+GPX 文件对，解析后存入 data.db 并导出 activities.json。

用法:
    python run_page/apple_health_sync.py           # 增量导入
    python run_page/apple_health_sync.py --only-run # 只导入跑步
    python run_page/apple_health_sync.py --dir <路径> # 指定目录
    python run_page/apple_health_sync.py --force     # 强制重新导入
"""

import argparse
import datetime
import importlib.util
import json
import os
import sys
from collections import namedtuple
from datetime import timedelta

# Add run_page to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import JSON_FILE, SQL_FILE, GPX_FOLDER

from apple_health_parser import (
    AppleActivity,
    match_gpx_file,
    parse_activity_type,
    parse_activity,
    generate_laps_from_route,
    generate_streams_from_route,
    FILENAME_PATTERN,
)
from synced_data_file_logger import save_synced_data_file_list, load_synced_file_list


def _load_generator_db():
    """Load generator.db module directly without triggering generator/__init__.py"""
    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "generator", "db.py")
    spec = importlib.util.spec_from_file_location("generator.db", db_path)
    module = importlib.util.module_from_spec(spec)
    sys.modules["generator.db"] = module
    spec.loader.exec_module(module)
    return module


# Load the generator.db module lazily (avoids heavy generator/__init__.py imports)
_generator_db = None


def _get_generator_db():
    global _generator_db
    if _generator_db is None:
        _generator_db = _load_generator_db()
    return _generator_db


def scan_activities(data_dir: str) -> list:
    """扫描目录，返回匹配的 JSON 文件列表"""
    json_files = []
    for f in os.listdir(data_dir):
        if f.endswith(".json") and FILENAME_PATTERN.match(f):
            json_files.append(f)
    return sorted(json_files)


def filter_skipped(json_files: list, only_run: bool, force: bool, imported_list: list) -> list:
    """过滤需要跳过的活动

    Returns:
        list of (json_filename, status) where status is "new", "skipped_imported", or "skipped_type"
    """
    results = []
    for f in json_files:
        # 类型过滤
        if only_run:
            type_result = parse_activity_type(f)
            if not type_result or type_result[0] != "Run":
                results.append((f, "skipped_type"))
                continue

        # 增量检查
        if not force and f in imported_list:
            results.append((f, "skipped_imported"))
            continue

        results.append((f, "new"))

    return results


def import_activity(data_dir: str, json_filename: str, session) -> bool:
    """导入单个活动，返回是否成功"""
    json_path = os.path.join(data_dir, json_filename)

    # 匹配 GPX
    gpx_filename = match_gpx_file(json_filename)
    if not gpx_filename:
        print(f"  Warning: cannot parse GPX filename: {json_filename}")
        return False

    gpx_path = os.path.join(data_dir, gpx_filename)
    if not os.path.exists(gpx_path):
        print(f"  Warning: GPX file not found: {gpx_filename}")
        return False

    try:
        # 解析
        activity = parse_activity(json_path, gpx_path, json_filename)

        # 构建 namedtuple 用于 update_or_create_activity
        start_point = namedtuple("start_point", "lat lon")
        run_map = namedtuple("polyline", "summary_polyline")

        # 构建 start_point
        lat, lon = None, None
        if activity.route_data:
            lat = activity.route_data[0].get("latitude")
            lon = activity.route_data[0].get("longitude")
        start_pt = start_point(lat, lon) if lat and lon else None

        # 构建 map
        activity_map = run_map(activity.summary_polyline)

        # 构建可复用的活动对象
        run_activity = namedtuple("activity", [
            "id", "name", "distance", "moving_time", "elapsed_time",
            "type", "subtype", "start_date", "start_date_local",
            "location_country", "map", "average_heartrate",
            "max_heartrate", "average_speed", "max_speed",
            "average_cadence", "calories", "device_name",
            "elevation_gain", "elev_high", "elev_low",
            "start_latlng",
        ])(
            id=activity.run_id,
            name=activity.name,
            distance=activity.distance,
            moving_time=timedelta(seconds=activity.moving_time),
            elapsed_time=timedelta(seconds=activity.elapsed_time),
            type=activity.type,
            subtype=activity.subtype,
            start_date=activity.start_date,
            start_date_local=activity.start_date_local,
            location_country="",
            map=activity_map,
            average_heartrate=activity.average_heartrate,
            max_heartrate=activity.max_heartrate,
            average_speed=activity.average_speed,
            max_speed=activity.max_speed,
            average_cadence=None,
            calories=activity.calories,
            device_name=activity.device_name,
            elevation_gain=activity.elevation_gain,
            elev_high=activity.elev_high,
            elev_low=activity.elev_low,
            start_latlng=start_pt,
        )

        # 写入 activities 表
        db = _get_generator_db()
        db.update_or_create_activity(session, run_activity)

        # 生成 Laps
        try:
            generate_laps_from_route(activity, session)
        except Exception as e:
            print(f"  Warning: Laps generation failed: {e}")

        # 生成 Streams
        try:
            generate_streams_from_route(activity, session)
        except Exception as e:
            print(f"  Warning: Streams generation failed: {e}")

        # 格式化输出
        dist_km = activity.distance / 1000
        duration_min = activity.moving_time // 60
        duration_sec = activity.moving_time % 60
        print(f"  + {activity.name} ({dist_km:.2f}km, {duration_min}:{duration_sec:02d})")

        return True

    except Exception as e:
        print(f"  Import failed {json_filename}: {e}")
        session.rollback()
        return False


def load_activities(session, only_run: bool) -> list:
    """从数据库加载活动数据，附带 laps 和 streams"""
    from polyline_processor import filter_out

    db = _get_generator_db()
    Activity = db.Activity
    ActivityLap = db.ActivityLap
    ActivityStream = db.ActivityStream

    query = session.query(Activity).filter(Activity.distance > 0.1)
    if only_run:
        query = query.filter(Activity.type == "Run")

    activities = query.order_by(Activity.start_date_local)
    activity_list = []

    streak = 0
    last_date = None
    for activity in activities:
        date = datetime.datetime.strptime(
            activity.start_date_local, "%Y-%m-%d %H:%M:%S"
        ).date()
        if last_date is None:
            streak = 1
        elif date == last_date:
            pass
        elif date == last_date + datetime.timedelta(days=1):
            streak += 1
        else:
            assert date > last_date
            streak = 1
        activity.streak = streak
        last_date = date
        activity.summary_polyline = filter_out(activity.summary_polyline)

        activity_dict = activity.to_dict()

        laps = session.query(ActivityLap).filter_by(
            activity_id=activity.run_id
        ).order_by(ActivityLap.lap_index).all()
        activity_dict["laps"] = [lap.to_dict() for lap in laps]

        streams = session.query(ActivityStream).filter_by(
            activity_id=activity.run_id
        ).all()
        streams_dict = {}
        for stream in streams:
            streams_dict[stream.stream_type] = stream.to_dict()
        activity_dict["streams"] = streams_dict

        activity_list.append(activity_dict)

    return activity_list


def main():
    parser = argparse.ArgumentParser(description="Import Apple Health data to running_page")
    parser.add_argument(
        "--only-run",
        dest="only_run",
        action="store_true",
        help="Only import running type activities",
    )
    parser.add_argument(
        "--dir",
        dest="data_dir",
        default=GPX_FOLDER,
        help="Data directory, default to GPX_OUT",
    )
    parser.add_argument(
        "--force",
        dest="force",
        action="store_true",
        help="Force re-import all files",
    )
    args = parser.parse_args()

    data_dir = args.data_dir
    print(f"Scanning directory: {data_dir}")

    if not os.path.exists(data_dir):
        print(f"Error: directory not found: {data_dir}")
        sys.exit(1)

    # 扫描
    json_files = scan_activities(data_dir)
    if not json_files:
        print("No activity files found.")
        return

    # 加载已导入列表
    imported_list = load_synced_file_list()

    # 过滤
    filtered = filter_skipped(json_files, args.only_run, args.force, imported_list)

    new_files = [f for f, status in filtered if status == "new"]
    skipped_files = [f for f, status in filtered if status == "skipped_imported"]
    skipped_type = [f for f, status in filtered if status == "skipped_type"]

    print(f"Found {len(filtered)} activity files:")
    for f, status in filtered:
        if status == "new":
            print(f"  + {f} (new)")
        elif status == "skipped_imported":
            print(f"  = {f} (already imported, skip)")
        elif status == "skipped_type":
            print(f"  - {f} (type mismatch, skip)")

    if not new_files:
        print("\nAll files imported, no updates needed.")
        return

    # 初始化数据库
    db = _get_generator_db()
    session = db.init_db(SQL_FILE)

    # 导入
    print(f"\nImporting {len(new_files)} new activities...")
    imported_names = []
    success_count = 0
    error_count = 0

    for f in new_files:
        ok = import_activity(data_dir, f, session)
        if ok:
            success_count += 1
            imported_names.append(f)
        else:
            error_count += 1
        session.commit()

    # 保存已导入列表
    if imported_names:
        all_imported = list(set(imported_list + imported_names))
        save_synced_data_file_list(all_imported)
        print(f"\nExporting activities.json...")

        activities_list = load_activities(session, args.only_run)
        with open(JSON_FILE, "w", encoding="utf-8") as f:
            json.dump(activities_list, f, ensure_ascii=False, indent=2)

    print(f"\n{'=' * 60}")
    print(f"Done! New activities: {success_count}", end="")
    if error_count:
        print(f", Failed: {error_count}", end="")
    if skipped_files:
        print(f", Skipped (already imported): {len(skipped_files)}", end="")
    if skipped_type:
        print(f", Skipped (type mismatch): {len(skipped_type)}", end="")
    print()
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
