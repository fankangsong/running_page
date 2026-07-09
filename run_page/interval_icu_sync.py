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
