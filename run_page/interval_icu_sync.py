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
