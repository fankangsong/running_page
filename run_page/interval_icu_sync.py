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


# ── Streams ────────────────────────────────────────────────


def _safely_extract_stream_data(stream_json: dict, stream_type: str) -> list | None:
    """Safely extract stream data array from stream JSON.
    Returns None if data is missing, empty, or wrong type."""
    data = stream_json.get("data")
    if not isinstance(data, list) or len(data) == 0:
        return None
    return data


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

        data = _safely_extract_stream_data(stream_obj, stream_type)
        if data is None:
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


def _map_interval_to_lap(interval: dict, activity_start_local: str):
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
    except Exception as e:
        print(f"  [WARN] Failed to compute lap start_date: {e}")
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
        lap_data = _map_interval_to_lap(interval, start_date_local)
        update_or_create_lap(
            generator.session,
            ID_OFFSET + activity_id,
            lap_data,
            idx,
        )
        saved += 1

    return saved


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
