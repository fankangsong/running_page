"""
Apple Health 数据解析模块
解析苹果健身导出的 JSON + GPX 文件对，返回结构化的活动数据。
"""

import hashlib
import json
import os
import re
import sys
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Optional

import polyline

# 项目路径
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.insert(0, current_dir)

from config import GPX_FOLDER, BASE_TIMEZONE

# 活动类型映射：文件名前缀 -> (type, subtype)
APPLE_ACTIVITY_TYPE_MAP = {
    "跑步": ("Run", "running"),
    "户外 跑步": ("Run", "running"),
    "室内 跑步": ("Run", "running"),
    "步行": ("Walk", "walking"),
    "户外 步行": ("Walk", "walking"),
    "室内 步行": ("Walk", "walking"),
    "徒步": ("Hike", "hiking"),
    "骑行": ("Ride", "cycling"),
    "户外 骑行": ("Ride", "cycling"),
    "室内 骑行": ("Ride", "cycling"),
}

# 文件名正则：{活动类型}-{开始时间}-{结束时间}.json
FILENAME_PATTERN = re.compile(
    r"^(.+?)-(\d{4}-\d{2}-\d{2}_\d{2}_\d{2}_\d{2})-(\d{4}-\d{2}-\d{2}_\d{2}_\d{2}_\d{2})\.json$"
)

KJ_TO_KCAL = 4.184

# UTC+8 时区（北京时间）
CST = timezone(timedelta(hours=8))


@dataclass
class AppleActivity:
    """苹果健身活动数据结构"""
    run_id: int
    name: str
    type: str
    subtype: str
    start_date: str
    start_date_local: str
    distance: float
    moving_time: int
    elapsed_time: int
    average_heartrate: Optional[float]
    max_heartrate: Optional[float]
    min_heartrate: Optional[float]
    average_speed: float
    max_speed: float
    elevation_gain: float
    elev_high: Optional[float]
    elev_low: Optional[float]
    calories: float
    device_name: Optional[str]
    summary_polyline: str
    is_indoor: bool
    route_data: list = field(default_factory=list)
    heart_rate_data: list = field(default_factory=list)


def generate_run_id(filename: str) -> int:
    """根据文件名生成唯一 run_id"""
    hash_str = hashlib.md5(filename.encode()).hexdigest()[:8]
    return int(hash_str, 16)


def match_gpx_file(json_filename: str) -> Optional[str]:
    """根据 JSON 文件名推导出对应的 GPX 文件名

    JSON: 户外 跑步-2026-06-30_20_24_57-2026-06-30_20_54_50.json
    GPX:  户外 跑步-Route-2026-06-30 20_24_57.gpx
    转换规则：将开始时间的下划线替换为空格，中间加 -Route-
    """
    match = FILENAME_PATTERN.match(json_filename)
    if not match:
        return None

    activity_type = match.group(1)
    start_time = match.group(2)  # "2026-06-30_20_24_57"
    start_time_gpx = start_time.replace("_", " ", 1)  # "2026-06-30 20_24_57"

    return f"{activity_type}-Route-{start_time_gpx}.gpx"


def parse_activity_type(filename: str) -> Optional[tuple]:
    """从文件名解析活动类型，返回 (type, subtype) 或 None"""
    match = FILENAME_PATTERN.match(filename)
    if not match:
        return None

    activity_type = match.group(1)
    return APPLE_ACTIVITY_TYPE_MAP.get(activity_type)


import gpxpy as mod_gpxpy


def extract_gpx_trackpoints(gpx_path: str) -> tuple[list, str]:
    """解析 GPX 文件，返回轨迹点列表和 summary_polyline

    Returns:
        (trackpoints, polyline_str)
        trackpoints: [{lat, lon, ele, time, speed}, ...]
        polyline_str: 编码后的 polyline 字符串
    """
    trackpoints = []
    polyline_container = []

    with open(gpx_path, "r", encoding="utf-8") as f:
        gpx = mod_gpxpy.parse(f)

    for track in gpx.tracks:
        for segment in track.segments:
            for point in segment.points:
                tp = {
                    "latitude": point.latitude,
                    "longitude": point.longitude,
                    "elevation": point.elevation,
                    "time": point.time,
                    "speed": None,
                }
                trackpoints.append(tp)
                polyline_container.append([point.latitude, point.longitude])

    polyline_str = polyline.encode(polyline_container) if polyline_container else ""
    return trackpoints, polyline_str


def parse_json_activity(json_path: str) -> dict:
    """解析 JSON 文件，提取活动元数据"""
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    workouts = data.get("data", {}).get("workouts", [])
    if not workouts:
        raise ValueError(f"No workouts found in {json_path}")

    return workouts[-1]


def extract_route_from_json(json_path: str) -> list:
    """从 JSON 文件的 route 数组提取轨迹数据"""
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    workouts = data.get("data", {}).get("workouts", [])
    if not workouts:
        return []

    workout = workouts[-1]
    route = workout.get("route", [])

    route_data = []
    for point in route:
        route_data.append({
            "latitude": point.get("latitude"),
            "longitude": point.get("longitude"),
            "altitude": point.get("altitude"),
            "speed": point.get("speed"),
            "timestamp": point.get("timestamp"),
        })

    return route_data


def extract_heart_rate_data(json_path: str) -> list:
    """从 JSON 提取心率时序数据"""
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    workouts = data.get("data", {}).get("workouts", [])
    if not workouts:
        return []

    workout = workouts[-1]
    return workout.get("heartRateData", [])


def parse_activity(json_path: str, gpx_path: str, filename: str) -> "AppleActivity":
    """解析一对 JSON+GPX 文件，返回 AppleActivity 对象"""
    filename_base = os.path.basename(json_path)
    run_id = generate_run_id(filename_base)

    type_result = parse_activity_type(filename_base)
    if not type_result:
        raise ValueError(f"Unknown activity type in filename: {filename_base}")
    activity_type, activity_subtype = type_result

    workout = parse_json_activity(json_path)

    distance_km = workout.get("distance", {}).get("qty", 0)
    distance_m = distance_km * 1000

    duration = workout.get("duration", 0)

    heart_rate = workout.get("heartRate", {})
    avg_hr = heart_rate.get("avg", {}).get("qty")
    max_hr = heart_rate.get("max", {}).get("qty")
    min_hr = heart_rate.get("min", {}).get("qty")

    # 从 totalEnergy 提取卡路里（所有样本均有此字段，单位为 kJ）
    energy_kj = workout.get("totalEnergy", {}).get("qty", 0)
    if energy_kj == 0:
        energy_kj = workout.get("activeEnergyBurned", {}).get("qty", 0)
    calories = energy_kj / KJ_TO_KCAL if energy_kj else 0

    # 设备名称
    source = workout.get("sourceName", workout.get("source", ""))
    if source and "Apple Watch" in source:
        device_name = source
    else:
        device_name = None

    is_indoor = bool(workout.get("isIndoor", False))

    # 从文件名解析时间
    match = FILENAME_PATTERN.match(filename_base)
    start_time_str = match.group(2) if match else ""
    start_local = datetime.strptime(start_time_str, "%Y-%m-%d_%H_%M_%S")
    start_utc = start_local - timedelta(hours=8)

    # 名称：使用 workout name 或从类型+时间生成
    workout_name = workout.get("name")
    if workout_name:
        name = workout_name
    else:
        name = f"{activity_type} - {start_local.strftime('%Y-%m-%d %H:%M')}"

    gpx_trackpoints, summary_polyline = extract_gpx_trackpoints(gpx_path)

    route_data = extract_route_from_json(json_path)
    heart_rate_data = extract_heart_rate_data(json_path)

    # 计算速度/海拔统计
    speeds = [p["speed"] for p in route_data if p.get("speed") is not None]
    altitudes = [p["altitude"] for p in route_data if p.get("altitude") is not None]

    average_speed = sum(speeds) / len(speeds) if speeds else 0
    max_speed = max(speeds) if speeds else 0
    elev_high = max(altitudes) if altitudes else None
    elev_low = min(altitudes) if altitudes else None

    # 累计爬升
    elevation_gain = 0.0
    if len(altitudes) > 1:
        for i in range(1, len(altitudes)):
            diff = altitudes[i] - altitudes[i - 1]
            if diff > 0:
                elevation_gain += diff

    return AppleActivity(
        run_id=run_id,
        name=name,
        type=activity_type,
        subtype=activity_subtype,
        start_date=start_utc.strftime("%Y-%m-%d %H:%M:%S"),
        start_date_local=start_local.strftime("%Y-%m-%d %H:%M:%S"),
        distance=distance_m,
        moving_time=int(duration),
        elapsed_time=int(duration),
        average_heartrate=avg_hr,
        max_heartrate=max_hr,
        min_heartrate=min_hr,
        average_speed=average_speed,
        max_speed=max_speed,
        elevation_gain=elevation_gain,
        elev_high=elev_high,
        elev_low=elev_low,
        calories=calories,
        device_name=device_name,
        summary_polyline=summary_polyline,
        is_indoor=is_indoor,
        route_data=route_data,
        heart_rate_data=heart_rate_data,
    )


# Lazy imports for db functions (avoid cascading import issues)
# These are only needed when actually calling generate_laps_from_route / generate_streams_from_route


def generate_laps_from_route(activity: AppleActivity, session) -> list:
    """按每公里分割生成 ActivityLap 记录并写入数据库"""
    route_data = activity.route_data
    if not route_data or activity.distance < 1000:
        return []

    laps = []
    lap_index = 1
    next_km = 1000.0

    cumulative_distance = 0.0
    lap_speeds = []
    lap_heartrates = []
    lap_start_time = None

    for i, point in enumerate(route_data):
        if i == 0:
            lap_start_time = point.get("timestamp")

        # 累计距离：speed(m/s) * time_delta(s)
        if i > 0 and route_data[i-1].get("speed") is not None and point.get("timestamp") and route_data[i-1].get("timestamp"):
            try:
                t1 = datetime.strptime(route_data[i-1]["timestamp"], "%Y-%m-%d %H:%M:%S %z")
                t2 = datetime.strptime(point["timestamp"], "%Y-%m-%d %H:%M:%S %z")
                dt = (t2 - t1).total_seconds()
                speed = route_data[i-1].get("speed", 0)
                cumulative_distance += speed * dt
            except Exception:
                speed = route_data[i-1].get("speed", 0)
                cumulative_distance += speed * 2.0

        if point.get("speed") is not None:
            lap_speeds.append(point["speed"])

        if cumulative_distance >= next_km or i == len(route_data) - 1:
            avg_speed = sum(lap_speeds) / len(lap_speeds) if lap_speeds else 0

            try:
                end_time = datetime.strptime(point["timestamp"], "%Y-%m-%d %H:%M:%S %z")
                start_dt = datetime.strptime(lap_start_time, "%Y-%m-%d %H:%M:%S %z") if lap_start_time else end_time
                elapsed = int((end_time - start_dt).total_seconds())
            except Exception:
                end_time = datetime.strptime(activity.start_date_local, "%Y-%m-%d %H:%M:%S")
                start_dt = end_time
                elapsed = 0

            lap_distance = min(cumulative_distance - (next_km - 1000.0), 1000.0)

            lap_data = type("LapData", (), {
                "distance": lap_distance,
                "elapsed_time": elapsed,
                "moving_time": elapsed,
                "average_speed": avg_speed,
                "average_heartrate": None,
                "total_elevation_gain": 0.0,
                "start_date": start_dt,
            })()

            from generator.db import update_or_create_lap as _update_lap
            _update_lap(session, activity.run_id, lap_data, lap_index)

            laps.append({
                "lap_index": lap_index,
                "distance": lap_distance,
                "elapsed_time": elapsed,
                "average_speed": avg_speed,
            })

            lap_index += 1
            next_km += 1000.0
            lap_speeds = []
            lap_start_time = point.get("timestamp")

    return laps


def generate_streams_from_route(activity: AppleActivity, session) -> dict:
    """从 route 数据生成 ActivityStream 记录并写入数据库"""
    route_data = activity.route_data
    if not route_data:
        return {}

    streams = {}

    from generator.db import update_or_create_stream

    speeds = [p["speed"] for p in route_data if p.get("speed") is not None]
    if speeds:
        update_or_create_stream(session, activity.run_id, "velocity_smooth", speeds)
        streams["velocity_smooth"] = speeds

    altitudes = [p["altitude"] for p in route_data if p.get("altitude") is not None]
    if altitudes:
        update_or_create_stream(session, activity.run_id, "altitude", altitudes)
        streams["altitude"] = altitudes

    # cumulative distance
    distances = []
    cumulative = 0.0
    for i, point in enumerate(route_data):
        if i > 0 and route_data[i-1].get("speed") is not None and point.get("timestamp") and route_data[i-1].get("timestamp"):
            try:
                t1 = datetime.strptime(route_data[i-1]["timestamp"], "%Y-%m-%d %H:%M:%S %z")
                t2 = datetime.strptime(point["timestamp"], "%Y-%m-%d %H:%M:%S %z")
                dt = (t2 - t1).total_seconds()
                cumulative += route_data[i-1].get("speed", 0) * dt
            except Exception:
                pass
        distances.append(cumulative)
    if distances:
        update_or_create_stream(session, activity.run_id, "distance", distances)
        streams["distance"] = distances

    # relative time
    if route_data[0].get("timestamp"):
        try:
            t0 = datetime.strptime(route_data[0]["timestamp"], "%Y-%m-%d %H:%M:%S %z")
            times = []
            for point in route_data:
                if point.get("timestamp"):
                    t = datetime.strptime(point["timestamp"], "%Y-%m-%d %H:%M:%S %z")
                    times.append(int((t - t0).total_seconds()))
                else:
                    times.append(0)
            if times:
                update_or_create_stream(session, activity.run_id, "time", times)
                streams["time"] = times
        except Exception:
            pass

    # heartrate
    hr_data = activity.heart_rate_data
    if hr_data:
        hr_values = []
        for hr in hr_data:
            if isinstance(hr, dict):
                avg = hr.get("Avg", hr.get("avg", hr.get("quantity")))
                if avg is not None:
                    hr_values.append(float(avg))
        if hr_values:
            update_or_create_stream(session, activity.run_id, "heartrate", hr_values)
            streams["heartrate"] = hr_values

    return streams


# ============================================================
# Test functions
# ============================================================

def test_match_gpx_file():
    """测试 JSON->GPX 文件名匹配"""
    json_file = "户外 跑步-2026-06-30_20_24_57-2026-06-30_20_54_50.json"
    expected = "户外 跑步-Route-2026-06-30 20_24_57.gpx"
    result = match_gpx_file(json_file)
    assert result == expected, f"Expected {expected}, got {result}"

    json_file2 = "徒步-2025-12-20_13_47_44-2025-12-20_18_24_01.json"
    expected2 = "徒步-Route-2025-12-20 13_47_44.gpx"
    result2 = match_gpx_file(json_file2)
    assert result2 == expected2, f"Expected {expected2}, got {result2}"

    result3 = match_gpx_file("unknown-file.json")
    assert result3 is None, f"Expected None, got {result3}"

    # Walk and Ride formats
    json_walk = "户外 步行-2026-05-24_20_12_36-2026-05-24_21_12_43.json"
    expected_walk = "户外 步行-Route-2026-05-24 20_12_36.gpx"
    assert match_gpx_file(json_walk) == expected_walk

    json_ride = "户外 骑行-2025-11-16_11_29_45-2025-11-16_14_20_37.json"
    expected_ride = "户外 骑行-Route-2025-11-16 11_29_45.gpx"
    assert match_gpx_file(json_ride) == expected_ride

    print("test_match_gpx_file PASSED")


def test_parse_activity_type():
    """测试活动类型映射"""
    cases = [
        ("户外 跑步-2026-06-30_20_24_57-2026-06-30_20_54_50.json", ("Run", "running")),
        ("徒步-2025-12-20_13_47_44-2025-12-20_18_24_01.json", ("Hike", "hiking")),
        ("户外 步行-2026-05-24_20_12_36-2026-05-24_21_12_43.json", ("Walk", "walking")),
        ("户外 骑行-2025-11-16_11_29_45-2025-11-16_14_20_37.json", ("Ride", "cycling")),
        ("室内 跑步-2026-01-01_08_00_00-2026-01-01_09_00_00.json", ("Run", "running")),
        ("未知 运动-2026-01-01_08_00_00.json", None),
    ]
    for filename, expected in cases:
        result = parse_activity_type(filename)
        assert result == expected, f"Filename: {filename}, Expected: {expected}, Got: {result}"
    print("test_parse_activity_type PASSED")


def test_generate_run_id():
    """测试 run_id 生成的确定性和范围"""
    id1 = generate_run_id("test-file-2026-01-01_08_00_00.json")
    id2 = generate_run_id("test-file-2026-01-01_08_00_00.json")
    assert id1 == id2, "Same input should produce same run_id"

    id3 = generate_run_id("different-file-2026-01-01_08_00_00.json")
    assert id1 != id3, "Different input should produce different run_id"

    assert id1 > 0, "run_id should be positive"
    print("test_generate_run_id PASSED")


def test_parse_sample_activities():
    """测试所有四种样本活动的解析"""
    samples = [
        {
            "json": "户外 跑步-2026-06-30_20_24_57-2026-06-30_20_54_50.json",
            "gpx": "户外 跑步-Route-2026-06-30 20_24_57.gpx",
            "expected_type": "Run",
            "expected_subtype": "running",
            "min_distance_km": 4.5,
        },
        {
            "json": "徒步-2025-12-20_13_47_44-2025-12-20_18_24_01.json",
            "gpx": "徒步-Route-2025-12-20 13_47_44.gpx",
            "expected_type": "Hike",
            "expected_subtype": "hiking",
            "min_distance_km": 4.5,
        },
        {
            "json": "户外 步行-2026-05-24_20_12_36-2026-05-24_21_12_43.json",
            "gpx": "户外 步行-Route-2026-05-24 20_12_36.gpx",
            "expected_type": "Walk",
            "expected_subtype": "walking",
            "min_distance_km": 4.0,
        },
        {
            "json": "户外 骑行-2025-11-16_11_29_45-2025-11-16_14_20_37.json",
            "gpx": "户外 骑行-Route-2025-11-16 11_29_45.gpx",
            "expected_type": "Ride",
            "expected_subtype": "cycling",
            "min_distance_km": 4.5,
        },
    ]

    for sample in samples:
        json_path = os.path.join(GPX_FOLDER, sample["json"])
        gpx_path = os.path.join(GPX_FOLDER, sample["gpx"])

        if not os.path.exists(json_path):
            print(f"  SKIP {sample['json']} (file not found)")
            continue
        if not os.path.exists(gpx_path):
            print(f"  SKIP {sample['gpx']} (file not found)")
            continue

        print(f"\n  Parsing: {sample['json']}")
        activity = parse_activity(json_path, gpx_path, sample["json"])

        assert activity.type == sample["expected_type"], f"type: expected {sample['expected_type']}, got {activity.type}"
        assert activity.subtype == sample["expected_subtype"], f"subtype: expected {sample['expected_subtype']}, got {activity.subtype}"
        assert activity.distance > 0, "distance should be positive"
        assert activity.distance / 1000 >= sample["min_distance_km"], f"distance too small: {activity.distance/1000:.2f}km"
        assert activity.moving_time > 0, "moving_time should be positive"
        assert activity.average_heartrate is not None, "average_heartrate should not be None"
        assert activity.max_heartrate is not None, "max_heartrate should not be None"
        assert activity.calories > 0, "calories should be positive"
        assert len(activity.summary_polyline) > 0, "summary_polyline should not be empty"
        assert len(activity.route_data) > 0, "route_data should not be empty"
        assert len(activity.heart_rate_data) > 0, "heart_rate_data should not be empty"
        assert isinstance(activity.is_indoor, bool), "is_indoor should be bool"

        print(f"    type: {activity.type}/{activity.subtype}")
        print(f"    distance: {activity.distance/1000:.2f}km")
        print(f"    duration: {activity.moving_time}s")
        print(f"    avg_hr: {activity.average_heartrate:.1f}")
        print(f"    max_hr: {activity.max_heartrate}")
        print(f"    calories: {activity.calories:.0f} kcal")
        print(f"    route points: {len(activity.route_data)}")
        print(f"    hr points: {len(activity.heart_rate_data)}")
        print(f"    polyline len: {len(activity.summary_polyline)}")
        print(f"    avg_speed: {activity.average_speed:.2f} m/s")
        print(f"    max_speed: {activity.max_speed:.2f} m/s")
        print(f"    elev_high: {activity.elev_high}")
        print(f"    elev_low: {activity.elev_low}")
        print(f"    elevation_gain: {activity.elevation_gain:.1f}m")
        print(f"    is_indoor: {activity.is_indoor}")
        print(f"    start_date: {activity.start_date}")
        print(f"    start_date_local: {activity.start_date_local}")

    print("\ntest_parse_sample_activities PASSED")


if __name__ == "__main__":
    print("=" * 60)
    print("Apple Health Parser Tests")
    print("=" * 60)

    test_match_gpx_file()
    test_parse_activity_type()
    test_generate_run_id()
    test_parse_sample_activities()

    print("\n" + "=" * 60)
    print("All tests PASSED")
    print("=" * 60)
