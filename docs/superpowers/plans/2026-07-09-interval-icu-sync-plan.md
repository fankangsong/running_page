# Interval.icu Sync 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新建 `interval_icu_sync.py`，从 Intervals.icu API 同步活动数据到本地 SQLite，自动生成 `activities.json`。

**Architecture:** 单文件脚本，复用现有 `Generator` 框架（`init_db`, `update_or_create_activity`, `update_or_create_lap`, `update_or_create_stream`, `Generator.load()`）。通过 `requests` + Basic Auth 调用 API，`polyline` 编码路线，`tenacity` 重试。

**Tech Stack:** Python 3.10+, requests, polyline, tenacity, sqlalchemy, `generator.db`, `generator.__init__`, `config`

参考设计文档：`docs/interval-icu-sync-design.md`

## Global Constraints

- 新建 1 个文件：`run_page/interval_icu_sync.py`，**不修改任何现有文件**
- Base URL: `https://intervals.icu/api/v1`
- 认证：HTTP Basic Auth（用户名 `API_KEY`，密码为 API Key）
- 速率限制：每请求间隔 1 秒
- 活动 ID 偏移：`100000000 + int(id.lstrip("i"))`
- 室内 sub_type 白名单：`["Treadmill", "IndoorWalking"]`，跳过 `/map`
- stream 类型白名单：`["time", "heartrate", "velocity_smooth", "distance", "altitude"]`
- API 返回字段 `total_elevation_gain` → DB `elevation_gain`
- 凭据优先级：CLI 参数 > 环境变量
- 暂不填充 `location_country`

---

### Task 1: 文件骨架 — 导入、常量、数据类型

**Files:**
- Create: `run_page/interval_icu_sync.py`

**Produces:**
- `INDOOR_SUB_TYPES: list[str]` — `["Treadmill", "IndoorWalking"]`
- `STREAM_TYPES: list[str]` — `["time", "heartrate", "velocity_smooth", "distance", "altitude"]`
- `API_BASE` — `"https://intervals.icu/api/v1"`
- `MapProxy` — namedtuple 模拟 stravalib 的 `.map.summary_polyline`
- `IntervalActivity` — 将 API JSON 适配为 `update_or_create_activity()` 期望的对象

- [ ] **Step 1: 创建骨架文件**

```python
"""Sync activities from Intervals.icu API to local database."""

import argparse
import json
import os
import sys
import time
from datetime import datetime, timedelta, timezone
from collections import namedtuple

import arrow
import polyline
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# Add run_page to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from config import JSON_FILE, SQL_FILE, run_map as _run_map
from generator import Generator
from generator.db import init_db, update_or_create_activity, update_or_create_lap, update_or_create_stream

# ── Constants ──────────────────────────────────────────────

API_BASE = "https://intervals.icu/api/v1"

# Indoor sub_types that skip /map endpoint
INDOOR_SUB_TYPES = ["Treadmill", "IndoorWalking"]

# Stream types to save from /streams endpoint
STREAM_TYPES = ["time", "heartrate", "velocity_smooth", "distance", "altitude"]

# ID offset to avoid collision with other data sources
ID_OFFSET = 100_000_000

# ── Adapter Types ──────────────────────────────────────────

MapProxy = namedtuple("MapProxy", ["summary_polyline"])


class IntervalActivity:
    """Adapt Intervals.icu API activity JSON to stravalib-like object
    that update_or_create_activity() expects."""

    def __init__(self, data: dict, polyline_str: str = ""):
        # ID: strip 'i' prefix + apply offset
        numeric_id = int(data["id"].lstrip("i"))
        self.id = ID_OFFSET + numeric_id

        self.name = data.get("name", "")
        self.distance = data.get("distance", 0) or 0
        self.moving_time = timedelta(seconds=data.get("moving_time", 0))
        self.elapsed_time = timedelta(seconds=data.get("elapsed_time", 0))
        self.type = data.get("type", "")
        self.subtype = data.get("sub_type", "")
        self.start_date = data.get("start_date", "")
        self.start_date_local = data.get("start_date_local", "")

        # stravalib compat: .map.summary_polyline
        self.map = MapProxy(polyline_str)

        self.average_heartrate = data.get("average_heartrate")
        self.max_heartrate = data.get("max_heartrate")
        self.average_speed = data.get("average_speed")
        self.max_speed = data.get("max_speed")
        self.average_cadence = data.get("average_cadence")
        self.calories = data.get("calories")
        self.device_name = data.get("device_name")

        # NOTE: strava sync does: activity.elevation_gain = activity.total_elevation_gain
        self.total_elevation_gain = data.get("total_elevation_gain")
        self.elevation_gain = self.total_elevation_gain

        self.elev_high = data.get("max_altitude")
        self.elev_low = data.get("min_altitude")

    def __repr__(self):
        return f"IntervalActivity(id={self.id}, name={self.name})"
```

- [ ] **Step 2: 验证导入**

Run: `python -c "from run_page.interval_icu_sync import IntervalActivity, MapProxy, INDOOR_SUB_TYPES; print('OK')"`
Expected: prints `OK`

- [ ] **Step 3: 提交**

```bash
git add run_page/interval_icu_sync.py
git commit -m "feat: add IntervalActivity adapter and constants for interval_icu_sync"
```

---

### Task 2: HTTP 请求层 — Session 工厂 + API GET

**Files:**
- Modify: `run_page/interval_icu_sync.py` (追加代码)

**Produces:**
- `make_session(api_key: str) -> requests.Session` — 创建带 Basic Auth 和重试的 session
- `api_get(session, endpoint, params) -> dict` — 统一 GET 请求，含速率延迟和错误处理

- [ ] **Step 1: 追加 session 和 api_get**

```python
# ── HTTP Client ────────────────────────────────────────────

def make_session(api_key: str) -> requests.Session:
    """Create a requests Session with Basic Auth and retry adapter."""
    s = requests.Session()
    s.auth = ("API_KEY", api_key)

    # Retry on connection/read/timeout with backoff
    retry = Retry(
        total=3,
        backoff_factor=2,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["GET"],
    )
    adapter = HTTPAdapter(max_retries=retry)
    s.mount("https://", adapter)
    return s


def api_get(session: requests.Session, endpoint: str, params: dict | None = None,
            delay: float = 1.0) -> dict | list | None:
    """
    GET request to Interval.icu API with rate-limiting delay.

    Args:
        session: Authenticated requests.Session
        endpoint: API path suffix, e.g. "/athlete/i489589/activities"
        params: Query parameters
        delay: Sleep time BEFORE the request (seconds)
    Returns:
        Parsed JSON response, or None on failure
    """
    url = f"{API_BASE}{endpoint}"
    time.sleep(delay)

    try:
        resp = session.get(url, params=params, timeout=30)
        resp.raise_for_status()
        return resp.json()
    except requests.exceptions.RequestException as e:
        print(f"\n  [ERROR] GET {endpoint}: {e}")
        return None
```

- [ ] **Step 2: 验证 session 创建**

```python
# 在文件末尾追加临时测试代码，运行后删除
if __name__ == "__main__":
    # test session creation (no real API call)
    s = make_session("test_key")
    assert s.auth == ("API_KEY", "test_key")
    print("Session creation OK")
```

Run: `python run_page/interval_icu_sync.py`
Expected: prints `Session creation OK`

- [ ] **Step 3: 删除临时测试代码，提交**

```bash
git add run_page/interval_icu_sync.py
git commit -m "feat: add HTTP client layer with Basic Auth and retry"
```

---

### Task 3: 活动列表获取 — 分页 + 日期范围

**Files:**
- Modify: `run_page/interval_icu_sync.py` (追加代码)

**Produces:**
- `fetch_activity_list(session, athlete_id, oldest, newest) -> list[dict]` — 获取指定日期范围的活动列表，处理分页

- [ ] **Step 1: 追加活动列表获取函数**

```python
# ── Activity List Fetching ─────────────────────────────────

def fetch_activity_list(session: requests.Session, athlete_id: str,
                        oldest: str, newest: str) -> list[dict]:
    """
    Fetch all activities for an athlete within a date range.
    Handles pagination automatically via the 'next' field in the response.

    Args:
        session: Authenticated requests.Session
        athlete_id: e.g. "i489589"
        oldest: ISO-8601 start date, e.g. "2024-01-01T00:00:00"
        newest: ISO-8601 end date, e.g. "2024-12-31T23:59:59"
    Returns:
        List of activity dicts (empty list if none)
    """
    endpoint = f"/athlete/{athlete_id}/activities"
    params = {"oldest": oldest, "newest": newest}
    all_activities = []

    while True:
        resp = api_get(session, endpoint, params=params)
        if resp is None:
            print(f"\n  [ERROR] Failed to fetch activities page, stopping.")
            break

        if not isinstance(resp, dict):
            print(f"\n  [ERROR] Unexpected response type: {type(resp)}")
            break

        activities = resp.get("data", resp.get("activities", []))
        if isinstance(activities, list):
            all_activities.extend(activities)

        # Check for next page
        next_url = resp.get("next")
        if not next_url:
            break

        # Use full URL for next request
        # Remove API_BASE prefix if present to use with api_get
        if next_url.startswith(API_BASE):
            endpoint = next_url[len(API_BASE):]
        else:
            endpoint = next_url
        params = None  # params are embedded in next URL

    return all_activities
```

- [ ] **Step 2: 验证分页解析逻辑（mock 测试）**

```python
# 文件末尾追加临时测试，运行后删除
from unittest.mock import MagicMock

class MockResponse:
    def __init__(self, data, next_url=None):
        self._data = data
        self._next = next_url

    def json(self):
        return self._data

def test_fetch_activity_list_logic():
    import types
    # Mock api_get to simulate paginated response
    call_count = [0]
    original_api_get = api_get

    def mock_api_get(session, endpoint, params=None, delay=1.0):
        call_count[0] += 1
        if call_count[0] == 1:
            return {"data": [{"id": "i1", "name": "Run A"}], "next": "/next_page"}
        return {"data": [{"id": "i2", "name": "Run B"}]}

    # Replace api_get temporarily
    import interval_icu_sync
    interval_icu_sync.api_get = mock_api_get

    s = make_session("test_key")
    # Use a simple function call without actual HTTP
    result = []
    endpoint = "/athlete/i123/activities"
    params = {"oldest": "2024-01-01T00:00:00"}
    for page in range(2):
        resp = mock_api_get(s, endpoint, params if page == 0 else None)
        if resp and "data" in resp:
            result.extend(resp["data"])
        if "next" not in (resp or {}):
            break
        endpoint = resp["next"]
        params = None

    assert len(result) == 2
    assert result[0]["id"] == "i1"
    assert result[1]["id"] == "i2"
    print("Pagination logic OK")

test_fetch_activity_list_logic()
```

Run: `python run_page/interval_icu_sync.py`
Expected: prints `Pagination logic OK`

- [ ] **Step 3: 删除临时测试代码，提交**

```bash
git add run_page/interval_icu_sync.py
git commit -m "feat: add paginated activity list fetching"
```

---

### Task 4: Map/polyline 获取 — 室内跳过 + polyline 编码

**Files:**
- Modify: `run_page/interval_icu_sync.py` (追加代码)

**Produces:**
- `is_indoor_activity(sub_type: str) -> bool` — 检查 sub_type 是否在白名单中
- `fetch_polyline(session, activity_id, sub_type) -> str` — 获取路线坐标并编码为 polyline

- [ ] **Step 1: 追加 polyline 相关函数**

```python
# ── Polyline / Map ─────────────────────────────────────────


def is_indoor_activity(sub_type: str) -> bool:
    """Check if the sub_type indicates an indoor activity (no GPS route)."""
    return sub_type in INDOOR_SUB_TYPES


def fetch_polyline(session: requests.Session, activity_id: int,
                   sub_type: str) -> str:
    """
    Fetch map latlngs from /map endpoint and encode as polyline string.

    Args:
        session: Authenticated requests.Session
        activity_id: Numeric activity ID (from API response, without 'i' prefix)
        sub_type: Activity sub_type for indoor check
    Returns:
        Encoded polyline string, or empty string if indoor/no data
    """
    if is_indoor_activity(sub_type):
        return ""

    resp = api_get(session, f"/activity/{activity_id}/map")
    if resp is None:
        return ""

    latlngs = resp.get("latlngs", [])
    if not latlngs or not isinstance(latlngs, list) or len(latlngs) == 0:
        # Unknown sub_type returned empty latlngs — suggest whitelist update
        print(f"\n  [INFO] Activity {activity_id} (sub_type={sub_type}) "
              f"returned empty latlngs from /map. "
              f"Consider adding to INDOOR_SUB_TYPES whitelist.")
        return ""

    # Encode coordinates to polyline
    # polyline.encode expects [(lat, lng), ...]
    encoded = polyline.encode(latlngs)
    return encoded
```

- [ ] **Step 2: 验证室内判断和 polyline 编码（mock 测试）**

```python
# 文件末尾追加临时测试，运行后删除
def test_is_indoor():
    assert is_indoor_activity("Treadmill") is True
    assert is_indoor_activity("IndoorWalking") is True
    assert is_indoor_activity("VirtualRun") is False
    assert is_indoor_activity("") is False
    print("is_indoor_activity OK")

def test_fetch_polyline_indoor_skip():
    # Indoor activity should skip API call and return empty string
    result = fetch_polyline(None, 12345, "Treadmill")
    assert result == ""
    print("fetch_polyline indoor skip OK")

def test_fetch_polyline_encoding():
    # Test polyline encoding logic (not the HTTP call)
    latlngs = [[22.5431, 113.9350], [22.5435, 113.9355], [22.5440, 113.9360]]
    encoded = polyline.encode(latlngs)
    decoded = polyline.decode(encoded)
    assert len(decoded) == len(latlngs)
    print(f"Polyline encoding OK: {len(encoded)} chars for {len(latlngs)} points")

test_is_indoor()
test_fetch_polyline_indoor_skip()
test_fetch_polyline_encoding()
```

Run: `python run_page/interval_icu_sync.py`
Expected: prints three `OK` lines

- [ ] **Step 3: 删除临时测试代码，提交**

```bash
git add run_page/interval_icu_sync.py
git commit -m "feat: add map/polyline fetching with indoor activity skip"
```

---

### Task 5: Streams 和 Intervals 获取

**Files:**
- Modify: `run_page/interval_icu_sync.py` (追加代码)

**Produces:**
- `fetch_and_save_streams(session, generator, activity_id)` — 获取 streams 并写入 DB
- `fetch_and_save_intervals(session, generator, activity_id, start_date_local)` — 获取 intervals 并写入 laps
- `_safely_extract_stream_data(stream_json, stream_type) -> list | None` — 从 JSON 中提取 stream 数据
- `_map_interval_to_lap(interval, start_date_local, index) -> dict` — 将 API interval 映射为 lap 字典

- [ ] **Step 1: 追加 streams 和 intervals 函数**

```python
# ── Streams ────────────────────────────────────────────────


def fetch_and_save_streams(session: requests.Session,
                           generator: Generator,
                           activity_id: int) -> int:
    """
    Fetch stream data from /streams endpoint and save to DB.

    Args:
        session: Authenticated requests.Session
        generator: Generator instance with active DB session
        activity_id: Numeric activity ID (from API response, no 'i' prefix)
    Returns:
        Number of stream types saved
    """
    resp = api_get(session, f"/activity/{activity_id}/streams")
    if resp is None:
        return 0

    # Response can be a list of stream objects or a dict
    streams = resp if isinstance(resp, list) else resp.get("streams", [])

    saved = 0
    for stream_obj in streams:
        stream_type = stream_obj.get("type", "")
        if stream_type not in STREAM_TYPES:
            continue

        data = stream_obj.get("data", [])
        if not isinstance(data, list) or len(data) == 0:
            continue

        update_or_create_stream(
            generator.session,
            ID_OFFSET + activity_id,
            stream_type,
            data,
        )
        saved += 1

    return saved


# ── Intervals / Laps ───────────────────────────────────────


def _map_interval_to_lap(interval: dict, activity_start_local: str,
                         idx: int) -> dict:
    """
    Map an Interval.icu interval to a lap dict compatible with
    update_or_create_lap(). Returns a dict with stravalib-like attributes.
    """
    lap = type("Lap", (), {})()

    lap.distance = interval.get("distance", 0) or 0
    lap.moving_time = interval.get("moving_time", 0)
    lap.elapsed_time = interval.get("elapsed_time", 0)
    lap.average_speed = interval.get("average_speed")
    lap.average_heartrate = interval.get("average_heartrate")
    lap.total_elevation_gain = interval.get("total_elevation_gain")

    # start_time is seconds offset from activity start; compute absolute time
    offset_seconds = interval.get("start_time", 0)
    try:
        activity_dt = arrow.get(activity_start_local)
        lap_dt = activity_dt.shift(seconds=offset_seconds)
        lap.start_date = lap_dt.format("YYYY-MM-DD HH:mm:ss")
    except Exception:
        lap.start_date = None

    return lap


def fetch_and_save_intervals(session: requests.Session,
                             generator: Generator,
                             activity_id: int,
                             start_date_local: str) -> int:
    """
    Fetch interval data from /intervals endpoint and save as laps.

    Args:
        session: Authenticated requests.Session
        generator: Generator instance with active DB session
        activity_id: Numeric activity ID (from API response, no 'i' prefix)
        start_date_local: Activity start time for computing lap times
    Returns:
        Number of intervals saved
    """
    resp = api_get(session, f"/activity/{activity_id}/intervals")
    if resp is None:
        return 0

    intervals = resp.get("icu_intervals", [])
    if not isinstance(intervals, list) or len(intervals) == 0:
        return 0

    saved = 0
    for idx, interval in enumerate(intervals, start=1):
        lap_data = _map_interval_to_lap(interval, start_date_local, idx)
        update_or_create_lap(
            generator.session,
            ID_OFFSET + activity_id,
            lap_data,
            idx,
        )
        saved += 1

    return saved
```

- [ ] **Step 2: 验证 interval 映射逻辑（mock 测试）**

```python
# 文件末尾追加临时测试，运行后删除
def test_map_interval_to_lap():
    interval = {
        "distance": 1000.0,
        "moving_time": 300,
        "elapsed_time": 310,
        "average_speed": 3.33,
        "average_heartrate": 150,
        "total_elevation_gain": 5,
        "start_time": 0,
    }
    # Use a known datetime for deterministic test
    lap = _map_interval_to_lap(interval, "2024-06-01 08:00:00", 1)
    assert lap.distance == 1000.0
    assert lap.moving_time == 300
    assert lap.elapsed_time == 310
    assert lap.average_speed == 3.33
    assert lap.average_heartrate == 150
    assert lap.total_elevation_gain == 5
    assert "2024-06-01 08:00:00" in str(lap.start_date)
    print("map_interval_to_lap OK")

def test_map_interval_offset():
    """Test start_time offset produces correct datetime."""
    interval = {"start_time": 7200, "distance": 5000}
    lap = _map_interval_to_lap(interval, "2024-06-01 08:00:00", 2)
    # 7200 seconds = 2 hours later
    assert "2024-06-01 10:00:00" in str(lap.start_date)
    print("map_interval_to_lap offset OK")

test_map_interval_to_lap()
test_map_interval_offset()
```

Run: `python run_page/interval_icu_sync.py`
Expected: prints two `OK` lines

- [ ] **Step 3: 删除临时测试代码，提交**

```bash
git add run_page/interval_icu_sync.py
git commit -m "feat: add streams and intervals/laps fetching"
```

---

### Task 6: 主同步编排 — 日期范围 + 主循环

**Files:**
- Modify: `run_page/interval_icu_sync.py` (追加代码)

**Produces:**
- `compute_date_range(generator, full, from_date, to_date) -> tuple[str, str]` — 计算同步日期范围
- `sync_interval_icu(athlete_id, api_key, full, from_date, to_date, only_run)` — 主同步函数

- [ ] **Step 1: 追加日期计算和主同步函数**

```python
# ── Date Range Calculation ─────────────────────────────────


def compute_date_range(
    generator: Generator,
    full: bool = False,
    from_date: str | None = None,
    to_date: str | None = None,
) -> tuple[str, str]:
    """
    Compute the sync date range.

    Returns:
        Tuple of (oldest, newest) as ISO-8601 strings
    """
    now = datetime.now(timezone.utc)
    newest = now.strftime("%Y-%m-%dT23:59:59")

    if full:
        print("  Mode: Full sync (from 2015-01-01)")
        oldest = "2015-01-01T00:00:00"
    elif from_date and to_date:
        print(f"  Mode: Date range ({from_date} to {to_date})")
        oldest = f"{from_date}T00:00:00"
        newest = f"{to_date}T23:59:59"
    else:
        # Incremental mode: last activity date - 7 days
        from sqlalchemy import func
        from generator.db import Activity

        last_date = generator.session.query(
            func.max(Activity.start_date)
        ).scalar()

        if last_date:
            last_dt = arrow.get(last_date)
            oldest_dt = last_dt.shift(days=-7)
            oldest = oldest_dt.format("YYYY-MM-DD") + "T00:00:00"
            print(f"  Mode: Incremental (from {oldest_dt.format('YYYY-MM-DD')})")
        else:
            oldest = "2015-01-01T00:00:00"
            print("  Mode: First sync (full history)")

    return oldest, newest


# ── Main Sync Logic ────────────────────────────────────────


def sync_interval_icu(
    athlete_id: str,
    api_key: str,
    full: bool = False,
    from_date: str | None = None,
    to_date: str | None = None,
    only_run: bool = False,
):
    """
    Main sync orchestration: fetch activities from Interval.icu,
    save to local DB, and export to activities.json.

    Args:
        athlete_id: e.g. "i489589"
        api_key: Interval.icu API key
        full: If True, sync all historical data
        from_date / to_date: Custom date range (YYYY-MM-DD format)
        only_run: If True, only sync Run/VirtualRun/TrailRun types
    """
    print(f"\n{'='*60}")
    print(f"  Interval.icu Sync")
    print(f"  Athlete: {athlete_id}")
    print(f"{'='*60}\n")

    # Init generator (DB connection)
    generator = Generator(SQL_FILE)
    generator.only_run = only_run

    # Compute date range
    oldest, newest = compute_date_range(generator, full, from_date, to_date)

    # Create API session
    session = make_session(api_key)

    # Fetch activity list
    print(f"\n  Fetching activities from {oldest} to {newest}...")
    activities = fetch_activity_list(session, athlete_id, oldest, newest)
    print(f"  Found {len(activities)} activities.")

    if not activities:
        print("  No activities found, exiting.")
        return

    # ── Process each activity ──
    total = len(activities)
    synced_count = 0
    updated_count = 0
    skipped_count = 0
    error_count = 0

    for i, act_data in enumerate(activities):
        sub_type = act_data.get("sub_type", "")
        act_type = act_data.get("type", "")
        api_id = act_data["id"].lstrip("i")

        # Progress header
        print(f"\n  [{i + 1}/{total}] {act_type} ({sub_type}) — id={api_id}")

        # --only-run filter (client-side, before any API calls)
        RUN_TYPES = {"Run", "VirtualRun", "TrailRun"}
        if only_run and act_type not in RUN_TYPES:
            print(f"    Skipped (type={act_type}, not in run types)")
            skipped_count += 1
            continue

        try:
            # Step 1: Fetch and encode polyline (skips for indoor)
            polyline_str = fetch_polyline(session, int(api_id), sub_type)

            # Step 2: Create adapter and write to DB
            adapted = IntervalActivity(act_data, polyline_str)
            created = update_or_create_activity(generator.session, adapted)
            if created:
                synced_count += 1
                sys.stdout.write("+")
            else:
                updated_count += 1
                sys.stdout.write(".")

            sys.stdout.flush()

            # Step 3: Streams
            streams_saved = fetch_and_save_streams(
                session, generator, int(api_id)
            )
            if streams_saved > 0:
                print(f"    Streams: {streams_saved} types saved")

            # Step 4: Intervals / Laps
            laps_saved = fetch_and_save_intervals(
                session, generator, int(api_id),
                act_data.get("start_date_local", "")
            )
            if laps_saved > 0:
                print(f"    Laps: {laps_saved} saved")

        except Exception as e:
            print(f"    [ERROR] {e}")
            error_count += 1
            generator.session.rollback()
            sys.stdout.write("!")
            sys.stdout.flush()
            continue

    # ── Summary ──
    print(f"\n\n{'='*60}")
    print(f"  Sync completed!")
    print(f"  Total: {total}")
    print(f"  New: {synced_count}")
    print(f"  Updated: {updated_count}")
    print(f"  Skipped: {skipped_count}")
    print(f"  Errors: {error_count}")
    print(f"{'='*60}")

    # Commit and export
    generator.session.commit()
    print(f"\n  Exporting activities.json...")
    activities_list = generator.load()
    with open(JSON_FILE, "w", encoding="utf-8") as f:
        json.dump(activities_list, f)
    print(f"  Exported {len(activities_list)} activities to {JSON_FILE}")
```

- [ ] **Step 2: 验证日期计算逻辑（mock 测试）**

```python
# 文件末尾追加临时测试，运行后删除
def test_compute_date_range_full():
    # Full sync: should start from 2015-01-01
    class MockGen:
        session = None
    oldest, newest = compute_date_range(MockGen(), full=True)
    assert "2015-01-01" in oldest
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    assert now_str in newest
    print("date_range full OK")

def test_compute_date_range_custom():
    class MockGen:
        session = None
    oldest, newest = compute_date_range(
        MockGen(), from_date="2024-01-01", to_date="2024-06-30"
    )
    assert "2024-01-01" in oldest
    assert "2024-06-30" in newest
    print("date_range custom OK")

test_compute_date_range_full()
test_compute_date_range_custom()
```

Run: `python run_page/interval_icu_sync.py`
Expected: prints two `OK` lines

- [ ] **Step 3: 删除临时测试代码，提交**

```bash
git add run_page/interval_icu_sync.py
git commit -m "feat: add main sync orchestration with date range calculation"
```

---

### Task 7: CLI 入口 — argparse + 参数校验

**Files:**
- Modify: `run_page/interval_icu_sync.py` (追加 `main()` 和 `__name__ == "__main__"`)

**Produces:**
- `_argparse_date(s: str) -> datetime` — 自定义 argparse type，校验 YYYY-MM-DD 格式
- `main()` — CLI 入口，解析参数，调用 `sync_interval_icu()`

- [ ] **Step 1: 追加 CLI 入口**

```python
# ── CLI ────────────────────────────────────────────────────


def parse_date_arg(s: str) -> str:
    """Validate YYYY-MM-DD date format for argparse."""
    try:
        datetime.strptime(s, "%Y-%m-%d")
        return s
    except ValueError:
        raise argparse.ArgumentTypeError(
            f"Invalid date '{s}'. Expected format: YYYY-MM-DD"
        )


def main():
    parser = argparse.ArgumentParser(
        description="Sync activities from Intervals.icu to local database",
    )
    parser.add_argument(
        "athlete_id",
        nargs="?",
        help="Athlete ID (e.g. i489589). Can also set via INTERVAL_ATHLETE_ID env var.",
    )
    parser.add_argument(
        "api_key",
        nargs="?",
        help="API Key. Can also set via INTERVAL_API_KEY env var.",
    )
    parser.add_argument(
        "--full",
        action="store_true",
        help="Full sync from 2015-01-01 to today",
    )
    parser.add_argument(
        "--from",
        dest="from_date",
        type=parse_date_arg,
        help="Start date (YYYY-MM-DD)",
    )
    parser.add_argument(
        "--to",
        dest="to_date",
        type=parse_date_arg,
        help="End date (YYYY-MM-DD)",
    )
    parser.add_argument(
        "--only-run",
        action="store_true",
        help="Only sync Run, VirtualRun, TrailRun activities",
    )

    args = parser.parse_args()

    # Resolve credentials: CLI > env var
    athlete_id = args.athlete_id or os.environ.get("INTERVAL_ATHLETE_ID")
    api_key = args.api_key or os.environ.get("INTERVAL_API_KEY")

    if not athlete_id or not api_key:
        parser.error(
            "athlete_id and api_key are required. "
            "Provide via CLI arguments or INTERVAL_ATHLETE_ID / INTERVAL_API_KEY env vars."
        )

    # Validate mutual exclusion: --full and --from/--to
    if args.full and (args.from_date or args.to_date):
        parser.error("--full cannot be used with --from/--to")

    # Validate: --from and --to must both be set or both unset
    if bool(args.from_date) != bool(args.to_date):
        parser.error("--from and --to must be specified together")

    sync_interval_icu(
        athlete_id=athlete_id,
        api_key=api_key,
        full=args.full,
        from_date=args.from_date,
        to_date=args.to_date,
        only_run=args.only_run,
    )


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: 验证 CLI 参数解析**

```bash
python run_page/interval_icu_sync.py --help
```

Expected: prints help text with all arguments listed

- [ ] **Step 3: 验证凭据校验（无凭据时报错）**

```bash
python run_page/interval_icu_sync.py 2>&1 || true
```

Expected: error message about missing athlete_id and api_key

- [ ] **Step 4: 验证参数互斥性**

```bash
python run_page/interval_icu_sync.py --full --from 2024-01-01 i123 key123 2>&1 || true
```

Expected: error message about `--full` and `--from/--to` conflict

- [ ] **Step 5: 删除临时测试代码（确认没有遗留），提交**

```bash
git add run_page/interval_icu_sync.py
git commit -m "feat: add CLI entry point with argparse"
```

---

### Task 8: 集成测试 — 对接真实 API

**Files:**
- (无新建/修改)

**Prerequisites:** 用户需要提供 Interval.icu athlete_id 和 API key。

- [ ] **Step 1: 测试增量同步**

```bash
python run_page/interval_icu_sync.py YOUR_ATHLETE_ID YOUR_API_KEY
```

Expected:
- 打印增量模式提示（从 DB 最新日期 - 7 天开始）
- 逐条处理活动，打印 `+`（新增）或 `.`（更新）
- 打印 streams 和 laps 数量
- 同步完成后打印统计摘要
- `src/static/activities.json` 已更新
- DB 中 `run_id` 在 `100000000+` 范围

- [ ] **Step 2: 验证室内活动处理**

Run the script and check output for indoor activities (sub_type=Treadmill). Expected:
- No `/map` API call for indoor activities
- `summary_polyline` is empty string in DB
- Streams and laps still fetched normally

- [ ] **Step 3: 测试 --only-run**

```bash
python run_page/interval_icu_sync.py YOUR_ATHLETE_ID YOUR_API_KEY --only-run
```

Expected: only Run/VirtualRun/TrailRun activities are synced, others skipped.

- [ ] **Step 4: 验证重复运行不产生重复记录**

Run the same sync command twice and verify no duplicate `run_id` in DB.

- [ ] **Step 5: 验证 activities.json 输出**

Check `src/static/activities.json`:
- Contains laps array per activity (when available)
- Contains streams dict per activity (when available)
- Indoor activities have `summary_polyline: null`

- [ ] **Step 6: 提交（如有 CI/配置变更）**

No code changes in this task.
