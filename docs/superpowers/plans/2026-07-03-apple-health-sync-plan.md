# Apple Health Sync 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增苹果健身数据导入能力，支持跑步/步行/徒步/骑行四种运动类型，将 GPX_OUT 目录下的苹果导出文件（JSON+GPX）解析后存入 data.db 并导出 activities.json。

**Architecture:** 两个新文件：`apple_health_parser.py` 负责解析 JSON+GPX 文件对并返回结构化数据，`apple_health_sync.py` 作为主入口负责扫描/匹配/去重/写入/导出。全部复用现有 `generator/db.py`、`Generator.load()`、`synced_data_file_logger.py`。

**Tech Stack:** Python 3.10+, polyline 库, GPX 解析库, SQLAlchemy, 现有 generator 框架

## Global Constraints

- 新增两个 Python 文件，**不修改任何现有文件**
- 项目运行在 Windows PowerShell 环境
- 工作目录：`d:\code\running_page`
- 编码统一使用 UTF-8
- 增量导入：通过 `imported.json` 持久化已导入文件列表
- 命名格式固定：`{活动类型}-{开始时间}-{结束时间}.json` + `{活动类型}-Route-{开始时间}.gpx`
- 时间格式差异：JSON 时间 `2026-06-30_20_24_57`，GPX 时间 `2026-06-30 20_24_57`
- 能量单位转换：JSON 中为 kJ，`calories` 字段需转为 kcal（kJ ÷ 4.184）
- distance 单位：JSON 中为 km，`distance` 字段需转为 m（×1000）
- Laps 按每 1km 自动分割生成

---

### Task 1: 解析模块 — apple_health_parser.py

**Files:**
- Create: `run_page/apple_health_parser.py`
- Test: `python run_page/apple_health_parser.py`

**Interfaces:**
- Produces: `AppleActivity` class (dataclass) — 包含活动元数据、GPS 轨迹点、心率时序等
- Produces: `parse_activity(json_path, gpx_path) -> AppleActivity` — 解析一对 JSON+GPX 文件
- Produces: `match_gpx_file(json_filename: str) -> str | None` — 根据 JSON 文件名查找对应的 GPX
- Produces: `parse_activity_type(filename: str) -> tuple[str, str] | None` — 从文件名解析活动类型

**AppleActivity 数据结构:**

```python
@dataclass
class AppleActivity:
    """苹果健身活动数据结构"""
    run_id: int
    name: str
    type: str            # "Run", "Walk", "Hike", "Ride"
    subtype: str         # "running", "walking", "hiking", "cycling"
    start_date: str      # UTC ISO: "2026-06-30 12:24:57"
    start_date_local: str # "2026-06-30 20:24:57"
    distance: float      # 米
    moving_time: int     # 秒
    elapsed_time: int    # 秒
    average_heartrate: float | None
    max_heartrate: float | None
    min_heartrate: float | None
    average_speed: float  # m/s
    max_speed: float      # m/s
    elevation_gain: float
    elev_high: float | None
    elev_low: float | None
    calories: float      # kcal
    device_name: str | None
    summary_polyline: str
    is_indoor: bool
    # 时序数据（用于生成 Laps 和 Streams）
    route_data: list[dict]  # [{latitude, longitude, altitude, speed, timestamp}, ...]
    heart_rate_data: list[dict]  # [{timestamp, avg, min, max}, ...]
```

- [ ] **Step 1: Write test functions**

```python
# 在文件末尾添加 __main__ 测试块
# 测试文件放在脚本本身，便于快速验证

def test_match_gpx_file():
    """测试 JSON→GPX 文件名匹配"""
    # JSON: 户外 跑步-2026-06-30_20_24_57-2026-06-30_20_54_50.json
    # GPX:  户外 跑步-Route-2026-06-30 20_24_57.gpx
    json_file = "户外 跑步-2026-06-30_20_24_57-2026-06-30_20_54_50.json"
    expected = "户外 跑步-Route-2026-06-30 20_24_57.gpx"
    result = match_gpx_file(json_file)
    assert result == expected, f"Expected {expected}, got {result}"

    # 测试徒步格式
    json_file2 = "徒步-2025-12-20_13_47_44-2025-12-20_18_24_01.json"
    expected2 = "徒步-Route-2025-12-20 13_47_44.gpx"
    result2 = match_gpx_file(json_file2)
    assert result2 == expected2, f"Expected {expected2}, got {result2}"

    # 测试不匹配的文件名
    result3 = match_gpx_file("unknown-file.json")
    assert result3 is None, f"Expected None, got {result3}"

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
```

- [ ] **Step 2: Write minimal implementation — imports, constants, and helper functions**

```python
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
from datetime import datetime, timedelta
from typing import Optional

import polyline

# 项目路径
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.insert(0, current_dir)

from config import GPX_FOLDER
from config import BASE_TIMEZONE


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
# 示例：户外 跑步-2026-06-30_20_24_57-2026-06-30_20_54_50.json
# 示例：徒步-2025-12-20_13_47_44-2025-12-20_18_24_01.json
FILENAME_PATTERN = re.compile(
    r"^(.+?)-(\d{4}-\d{2}-\d{2}_\d{2}_\d{2}_\d{2})-(\d{4}-\d{2}-\d{2}_\d{2}_\d{2}_\d{2})\.json$"
)

KJ_TO_KCAL = 4.184


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
```

- [ ] **Step 3: Write GPX polyline extraction function**

```python
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
                    "speed": None,  # GPX 标准不一定有速度
                }
                trackpoints.append(tp)
                polyline_container.append([point.latitude, point.longitude])
    
    polyline_str = polyline.encode(polyline_container) if polyline_container else ""
    return trackpoints, polyline_str
```

- [ ] **Step 4: Write JSON metadata extraction function**

```python
def parse_json_activity(json_path: str) -> dict:
    """解析 JSON 文件，提取活动元数据"""
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    # 苹果导出的 JSON 结构: {"data": {"workouts": [...]}}
    workouts = data.get("data", {}).get("workouts", [])
    if not workouts:
        raise ValueError(f"No workouts found in {json_path}")
    
    # 取最后一个 workout（通常是最新/最完整的记录）
    workout = workouts[-1]
    
    return workout
```

- [ ] **Step 5: Write route data extraction from JSON**

```python
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
            "speed": point.get("speed"),  # m/s
            "timestamp": point.get("timestamp"),
        })
    
    return route_data
```

- [ ] **Step 6: Write heart rate data extraction**

```python
def extract_heart_rate_data(json_path: str) -> list:
    """从 JSON 提取心率时序数据"""
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    workouts = data.get("data", {}).get("workouts", [])
    if not workouts:
        return []
    
    workout = workouts[-1]
    return workout.get("heartRateData", [])
```

- [ ] **Step 7: Write AppleActivity dataclass and main parse function**

```python
def parse_activity(json_path: str, gpx_path: str, filename: str) -> "AppleActivity":
    """解析一对 JSON+GPX 文件，返回 AppleActivity 对象"""
    filename_base = os.path.basename(json_path)
    run_id = generate_run_id(filename_base)
    
    # 解析活动类型
    type_result = parse_activity_type(filename_base)
    if not type_result:
        raise ValueError(f"Unknown activity type in filename: {filename_base}")
    activity_type, activity_subtype = type_result
    
    # 解析 JSON 元数据
    workout = parse_json_activity(json_path)
    
    # 距离：km -> m
    distance_km = workout.get("distance", {}).get("qty", 0)
    distance_m = distance_km * 1000
    
    # 时长：秒
    duration = workout.get("duration", 0)
    
    # 心率
    heart_rate = workout.get("heartRate", {})
    avg_hr = heart_rate.get("avg", {}).get("qty")
    max_hr = heart_rate.get("max", {}).get("qty")
    min_hr = heart_rate.get("min", {}).get("qty")
    
    # 能量：kJ -> kcal
    energy_kj = workout.get("totalEnergy", {}).get("qty", 0)
    if energy_kj == 0:
        # 备选字段
        energy_kj = workout.get("activeEnergy", {}).get("qty", 0)
    calories = energy_kj / KJ_TO_KCAL if energy_kj else 0
    
    # 设备名称
    source = workout.get("sourceName", workout.get("source", ""))
    if "Apple Watch" in source:
        device_name = source
    else:
        device_name = None
    
    # 室内外
    is_indoor = workout.get("isIndoor", False)
    
    # 开始时间
    # 从文件名提取本地时间
    match = FILENAME_PATTERN.match(filename_base)
    start_time_str = match.group(2) if match else ""
    start_local = datetime.strptime(start_time_str, "%Y-%m-%d_%H_%M_%S")
    start_utc = start_local - timedelta(hours=8)  # Asia/Shanghai = UTC+8
    
    # 名称
    name = f"{activity_type} - {start_local.strftime('%Y-%m-%d %H:%M')}"
    
    # 解析 GPX 获取 polyline
    gpx_trackpoints, summary_polyline = extract_gpx_trackpoints(gpx_path)
    
    # 从 JSON route 提取速度/海拔数据
    route_data = extract_route_from_json(json_path)
    heart_rate_data = extract_heart_rate_data(json_path)
    
    # 计算速度和海拔统计
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
```

- [ ] **Step 8: Write laps generation function**

```python
from generator.db import Activity, ActivityLap, ActivityStream, update_or_create_activity, update_or_create_lap, update_or_create_stream


def generate_laps_from_route(activity: AppleActivity, session) -> list:
    """按每公里分割生成 ActivityLap 记录并写入数据库"""
    route_data = activity.route_data
    if not route_data or activity.distance < 1000:
        return []
    
    laps = []
    lap_index = 1
    next_km = 1000.0  # 米，下一个公里标记
    
    # 计算累计距离：根据 route 中的速度和时间
    cumulative_distance = 0.0
    lap_start_idx = 0
    lap_speeds = []
    lap_heartrates = []
    lap_start_time = None
    
    for i, point in enumerate(route_data):
        if i == 0:
            lap_start_time = point.get("timestamp")
        
        # 累计距离：speed(m/s) × time_delta(s)
        if i > 0 and route_data[i-1].get("speed") and point.get("timestamp") and route_data[i-1].get("timestamp"):
            try:
                t1 = datetime.strptime(route_data[i-1]["timestamp"], "%Y-%m-%d %H:%M:%S %z")
                t2 = datetime.strptime(point["timestamp"], "%Y-%m-%d %H:%M:%S %z")
                dt = (t2 - t1).total_seconds()
                speed = route_data[i-1].get("speed", 0)
                cumulative_distance += speed * dt
            except:
                # 时间解析失败，用速度估算
                speed = route_data[i-1].get("speed", 0)
                cumulative_distance += speed * 2.0  # 假设 2s 间隔
        
        if point.get("speed") is not None:
            lap_speeds.append(point["speed"])
        
        if cumulative_distance >= next_km or i == len(route_data) - 1:
            # 计算该 lap 的统计数据
            avg_speed = sum(lap_speeds) / len(lap_speeds) if lap_speeds else 0
            avg_hr = None  # 从 heart_rate_data 计算
            
            # 解析 lap 时间
            try:
                end_time = datetime.strptime(point["timestamp"], "%Y-%m-%d %H:%M:%S %z")
                start_dt = datetime.strptime(lap_start_time, "%Y-%m-%d %H:%M:%S %z") if lap_start_time else end_time
                elapsed = int((end_time - start_dt).total_seconds())
            except:
                elapsed = 0
            
            lap = ActivityLap(
                activity_id=activity.run_id,
                lap_index=lap_index,
                distance=min(cumulative_distance - (next_km - 1000.0), 1000.0),
                elapsed_time=elapsed,
                moving_time=elapsed,
                average_speed=avg_speed,
                average_heartrate=avg_hr,
                total_elevation_gain=0.0,
                start_date=start_dt.strftime("%Y-%m-%d %H:%M:%S") if lap_start_time else activity.start_date_local,
            )
            update_or_create_lap(session, activity.run_id, lap, lap_index)
            laps.append(lap)
            
            lap_index += 1
            next_km += 1000.0
            lap_speeds = []
            lap_start_time = point.get("timestamp")
    
    return laps
```

- [ ] **Step 9: Write streams generation function**

```python
def generate_streams_from_route(activity: AppleActivity, session) -> dict:
    """从 route 数据生成 ActivityStream 记录并写入数据库"""
    route_data = activity.route_data
    if not route_data:
        return {}
    
    streams = {}
    
    # velocity_smooth
    speeds = [p["speed"] for p in route_data if p.get("speed") is not None]
    if speeds:
        update_or_create_stream(session, activity.run_id, "velocity_smooth", speeds)
        streams["velocity_smooth"] = speeds
    
    # altitude
    altitudes = [p["altitude"] for p in route_data if p.get("altitude") is not None]
    if altitudes:
        update_or_create_stream(session, activity.run_id, "altitude", altitudes)
        streams["altitude"] = altitudes
    
    # distance (cumulative)
    distances = []
    cumulative = 0.0
    for i, point in enumerate(route_data):
        if i > 0 and route_data[i-1].get("speed") and point.get("timestamp") and route_data[i-1].get("timestamp"):
            try:
                t1 = datetime.strptime(route_data[i-1]["timestamp"], "%Y-%m-%d %H:%M:%S %z")
                t2 = datetime.strptime(point["timestamp"], "%Y-%m-%d %H:%M:%S %z")
                dt = (t2 - t1).total_seconds()
                cumulative += route_data[i-1].get("speed", 0) * dt
            except:
                pass
        distances.append(cumulative)
    if distances:
        update_or_create_stream(session, activity.run_id, "distance", distances)
        streams["distance"] = distances
    
    # time (relative seconds)
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
        except:
            pass
    
    # heartrate (from heartRateData)
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
```

- [ ] **Step 10: Write __main__ test block**

```python
if __name__ == "__main__":
    print("=" * 60)
    print("Apple Health Parser Tests")
    print("=" * 60)
    
    # 测试文件名匹配
    test_match_gpx_file()
    test_parse_activity_type()
    
    # 测试实际文件解析
    json_file = os.path.join(GPX_FOLDER, "户外 跑步-2026-06-30_20_24_57-2026-06-30_20_54_50.json")
    gpx_file = os.path.join(GPX_FOLDER, "户外 跑步-Route-2026-06-30 20_24_57.gpx")
    
    if os.path.exists(json_file) and os.path.exists(gpx_file):
        print(f"\nParsing: {os.path.basename(json_file)}")
        activity = parse_activity(json_file, gpx_file, os.path.basename(json_file))
        print(f"  run_id: {activity.run_id}")
        print(f"  name: {activity.name}")
        print(f"  type: {activity.type} / {activity.subtype}")
        print(f"  distance: {activity.distance:.0f}m ({activity.distance/1000:.2f}km)")
        print(f"  duration: {activity.moving_time}s")
        print(f"  avg_hr: {activity.average_heartrate}")
        print(f"  max_hr: {activity.max_heartrate}")
        print(f"  calories: {activity.calories:.0f} kcal")
        print(f"  avg_speed: {activity.average_speed:.2f} m/s")
        print(f"  max_speed: {activity.max_speed:.2f} m/s")
        print(f"  elevation_gain: {activity.elevation_gain:.1f}m")
        print(f"  elev_high: {activity.elev_high}")
        print(f"  elev_low: {activity.elev_low}")
        print(f"  polyline len: {len(activity.summary_polyline)}")
        print(f"  route points: {len(activity.route_data)}")
        print(f"  heart rate points: {len(activity.heart_rate_data)}")
        print(f"  device: {activity.device_name}")
        print(f"  is_indoor: {activity.is_indoor}")
        print("\n✅ Parse test PASSED")
    else:
        print(f"\n⚠️ Sample files not found, skipping parse test")
        print(f"  JSON: {json_file}")
        print(f"  GPX:  {gpx_file}")
    
    print("\n" + "=" * 60)
    print("All tests PASSED")
```

- [ ] **Step 11: Run parser test**

```bash
cd d:\code\running_page
python run_page/apple_health_parser.py
```

Expected: All test functions print PASSED, and the sample running activity data is displayed.

- [ ] **Step 12: Commit**

```bash
git add run_page/apple_health_parser.py
git commit -m "feat: add apple health data parser module"
```

---

### Task 2: 主入口脚本 — apple_health_sync.py

**Files:**
- Create: `run_page/apple_health_sync.py`
- Test: `python run_page/apple_health_sync.py`

**Interfaces:**
- Consumes: `apple_health_parser.parse_activity()`, `apple_health_parser.generate_laps_from_route()`, `apple_health_parser.generate_streams_from_route()`, `apple_health_parser.match_gpx_file()`, `apple_health_parser.parse_activity_type()`
- Consumes: `generator.db.Activity`, `generator.db.update_or_create_activity()`, `generator.db.init_db()`
- Consumes: `synced_data_file_logger.save_synced_data_file_list()`, `synced_data_file_logger.load_synced_file_list()`
- Consumes: `Generator.load()` from `generator/__init__.py`

- [ ] **Step 1: Write complete script**

```python
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
import json
import os
import sys

# Add run_page to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import JSON_FILE, SQL_FILE, GPX_FOLDER
from generator import Generator
from generator.db import Activity, update_or_create_activity, init_db, update_or_create_lap
from synced_data_file_logger import save_synced_data_file_list, load_synced_file_list

from apple_health_parser import (
    AppleActivity,
    match_gpx_file,
    parse_activity_type,
    parse_activity,
    generate_laps_from_route,
    generate_streams_from_route,
    FILENAME_PATTERN,
)


def scan_activities(data_dir: str) -> list:
    """扫描目录，返回 JSON 文件列表"""
    json_files = []
    for f in os.listdir(data_dir):
        if f.endswith(".json") and FILENAME_PATTERN.match(f):
            json_files.append(f)
    return sorted(json_files)


def filter_skipped(json_files: list, only_run: bool, force: bool, imported_list: list) -> list:
    """过滤需要跳过的活动
    
    Returns:
        list of (json_filename, status) where status is "new" or "skipped"
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


def import_activity(data_dir: str, json_filename: str, session, generator: Generator) -> bool:
    """导入单个活动，返回是否成功"""
    json_path = os.path.join(data_dir, json_filename)
    
    # 匹配 GPX
    gpx_filename = match_gpx_file(json_filename)
    if not gpx_filename:
        print(f"  ⚠️ 无法解析 GPX 文件名: {json_filename}")
        return False
    
    gpx_path = os.path.join(data_dir, gpx_filename)
    if not os.path.exists(gpx_path):
        print(f"  ⚠️ GPX 文件不存在: {gpx_filename}")
        return False
    
    try:
        # 解析
        activity = parse_activity(json_path, gpx_path, json_filename)
        
        # 构建 namedtuple 用于 update_or_create_activity
        # 复用现有接口：将 AppleActivity 转换为 update_or_create_activity 期望的格式
        from collections import namedtuple
        
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
            moving_time=activity.moving_time,
            elapsed_time=activity.elapsed_time,
            type=activity.type,
            subtype=activity.subtype,
            start_date=activity.start_date,
            start_date_local=activity.start_date_local,
            location_country="",
            map=activity_map,
            average_heartrate=activity.average_heartrate,
            max_heartrate=activity.max_heartrate,
            average_cadence=None,
            calories=activity.calories,
            device_name=activity.device_name,
            elevation_gain=activity.elevation_gain,
            elev_high=activity.elev_high,
            elev_low=activity.elev_low,
            start_latlng=start_pt,
        )
        
        # 写入 activities 表
        created = update_or_create_activity(session, run_activity)
        
        # 生成 Laps
        try:
            generate_laps_from_route(activity, session)
        except Exception as e:
            print(f"  ⚠️ Laps 生成失败: {e}")
        
        # 生成 Streams
        try:
            generate_streams_from_route(activity, session)
        except Exception as e:
            print(f"  ⚠️ Streams 生成失败: {e}")
        
        # 格式化输出
        dist_km = activity.distance / 1000
        duration_min = activity.moving_time // 60
        duration_sec = activity.moving_time % 60
        print(f"  + {activity.name} ({dist_km:.2f}km, {duration_min}:{duration_sec:02d})")
        
        return True
        
    except Exception as e:
        print(f"  ❌ 导入失败 {json_filename}: {e}")
        session.rollback()
        return False


def main():
    parser = argparse.ArgumentParser(description="导入苹果健身数据到 running_page")
    parser.add_argument(
        "--only-run",
        dest="only_run",
        action="store_true",
        help="只导入跑步类型活动",
    )
    parser.add_argument(
        "--dir",
        dest="data_dir",
        default=GPX_FOLDER,
        help="数据文件目录，默认为 GPX_OUT",
    )
    parser.add_argument(
        "--force",
        dest="force",
        action="store_true",
        help="强制重新导入所有文件",
    )
    args = parser.parse_args()
    
    data_dir = args.data_dir
    print(f"扫描 {data_dir} 目录...")
    
    if not os.path.exists(data_dir):
        print(f"❌ 目录不存在: {data_dir}")
        sys.exit(1)
    
    # 扫描
    json_files = scan_activities(data_dir)
    if not json_files:
        print("未找到任何活动文件。")
        return
    
    # 加载已导入列表
    imported_list = load_synced_file_list()
    
    # 过滤
    filtered = filter_skipped(json_files, args.only_run, args.force, imported_list)
    
    new_files = [f for f, status in filtered if status == "new"]
    skipped_files = [f for f, status in filtered if status == "skipped_imported"]
    skipped_type = [f for f, status in filtered if status == "skipped_type"]
    
    print(f"找到 {len(filtered)} 个活动文件：")
    for f, status in filtered:
        if status == "new":
            print(f"  ✓ {f} (新)")
        elif status == "skipped_imported":
            print(f"  ✓ {f} (已导入，跳过)")
        elif status == "skipped_type":
            print(f"  ✓ {f} (类型不符，跳过)")
    
    if not new_files:
        print("\n✅ 所有文件已导入，无需更新。")
        return
    
    # 初始化数据库
    session = init_db(SQL_FILE)
    generator = Generator(SQL_FILE)
    generator.only_run = args.only_run
    
    # 导入
    print(f"\n正在导入 {len(new_files)} 个新活动...")
    imported_names = []
    success_count = 0
    error_count = 0
    
    for f in new_files:
        ok = import_activity(data_dir, f, session, generator)
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
        print(f"\n导出 activities.json...")
        
        activities_list = generator.load()
        with open(JSON_FILE, "w") as f:
            json.dump(activities_list, f, ensure_ascii=False, indent=2)
    
    print(f"\n{'='*60}")
    print(f"✅ 完成！新增 {success_count} 条活动", end="")
    if error_count:
        print(f"，{error_count} 条失败", end="")
    if skipped_files:
        print(f"，跳过 {len(skipped_files)} 条已导入", end="")
    if skipped_type:
        print(f"，{len(skipped_type)} 条类型不符", end="")
    print()
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Run initial import**

```bash
cd d:\code\running_page
python run_page/apple_health_sync.py
```

Expected output:
```
扫描 d:\code\running_page\GPX_OUT 目录...
找到 4 个活动文件：
  ✓ 户外 跑步-2026-06-30_20_24_57-2026-06-30_20_54_50.json (新)
  ✓ 徒步-2025-12-20_13_47_44-2025-12-20_18_24_01.json (新)
  ✓ 户外 步行-2026-05-24_20_12_36-2026-05-24_21_12_43.json (新)
  ✓ 户外 骑行-2025-11-16_11_29_45-2025-11-16_14_20_37.json (新)

正在导入 4 个新活动...
  + 户外 跑步 - 2026-06-30 20:24 (5.01km, 29:53)
  + 徒步 - 2025-12-20 13:47 (39.35km, 4:36:16)
  + 户外 步行 - 2026-05-24 20:12 (4.31km, 1:00:06)
  + 户外 骑行 - 2025-11-16 11:29 (5.18km, 44:10)

导出 activities.json...

============================================================
✅ 完成！新增 4 条活动
============================================================
```

- [ ] **Step 3: Verify incremental import**

```bash
cd d:\code\running_page
python run_page/apple_health_sync.py
```

Expected: All 4 files shown as "已导入，跳过", and "所有文件已导入，无需更新。"

- [ ] **Step 4: Verify --only-run flag**

```bash
cd d:\code\running_page
python run_page/apple_health_sync.py --force --only-run
```

Expected: Only "户外 跑步" activities imported, others skipped with "类型不符，跳过".

- [ ] **Step 5: Verify data in database**

```bash
cd d:\code\running_page
python -c "import sqlite3; conn = sqlite3.connect('run_page/data.db'); cursor = conn.cursor(); cursor.execute('SELECT run_id, name, type, distance/1000 as km, moving_time FROM activities WHERE type IN (\"Run\",\"Walk\",\"Hike\",\"Ride\") ORDER BY start_date_local'); [print(r) for r in cursor.fetchall()]; conn.close()"
```

Expected: At least 4 rows with the imported activity data.

- [ ] **Step 6: Verify activities.json**

```bash
cd d:\code\running_page
python -c "import json; data = json.load(open('src/static/activities.json')); print(f'Total activities: {len(data)}'); [print(f\"  {a['name']}: {a['type']}, {a['distance']/1000:.2f}km, laps={len(a.get('laps',[]))}, streams={list(a.get('streams',{}).keys())}\") for a in data[-5:]]"
```

Expected: Shows activities with laps and streams data populated.

- [ ] **Step 7: Commit**

```bash
git add run_page/apple_health_sync.py imported.json
git commit -m "feat: add apple health sync script with incremental import"
```

---

### Task 3: 端到端验证

**Files:**
- No new files
- Test: Run the full import pipeline

- [ ] **Step 1: Full clean test**

```bash
cd d:\code\running_page
# 清空已导入记录，重新导入
if (Test-Path imported.json) { Remove-Item imported.json }
python run_page/apple_health_sync.py
```

Expected: All 4 activities imported successfully.

- [ ] **Step 2: Run dev server and verify UI**

```bash
cd d:\code\running_page
pnpm build
```

Expected: Build succeeds without errors.

- [ ] **Step 3: Verify UI data display**

Start dev server and check that the new activities appear on the dashboard/tracks page with correct data (distance, duration, heart rate, map route, splits table, curves chart).

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: apple health sync - end-to-end verified"
```

---

## 任务依赖关系

```
Task 1 (parser) → Task 2 (sync script) → Task 3 (e2e verify)
```

每个 Task 完成后均可独立测试。Task 2 依赖 Task 1 的输出接口，Task 3 依赖前两者的完整实现。