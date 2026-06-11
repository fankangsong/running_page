#!/usr/bin/env python3
"""
Sync a single Strava activity with laps and streams data.
Usage: python run_page/sync_single_activity.py <activity_id>
"""

import sys
import os
import argparse

# Add run_page to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import SQL_FILE, JSON_FILE
from generator import Generator
import json


def sync_activity(activity_id: int):
    """Sync a single activity with laps and streams"""
    print(f"=" * 70)
    print(f"[SYNC] Syncing activity {activity_id}")
    print(f"=" * 70)

    # Initialize generator
    generator = Generator(SQL_FILE)

    # Load credentials from .env
    env_vars = {}
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    env_vars[key.strip()] = value.strip().strip('"').strip("'")

    client_id = env_vars.get("STRAVA_CLIENT_ID")
    client_secret = env_vars.get("STRAVA_CLIENT_SECRET")
    refresh_token = env_vars.get("STRAVA_REFRESH_TOKEN")

    if not all([client_id, client_secret, refresh_token]):
        print("[ERROR] Missing Strava credentials in .env file")
        sys.exit(1)

    generator.set_strava_config(client_id, client_secret, refresh_token)
    generator.check_access()

    # Get detailed activity data
    print(f"\n[1/3] Fetching detailed activity data...")
    try:
        detailed_activity = generator._get_with_retry(
            lambda: generator.client.get_activity(activity_id),
            f"get activity {activity_id}"
        )

        if not detailed_activity:
            print(f"[ERROR] Failed to get detailed activity data")
            sys.exit(1)

        print(f"  Type: {detailed_activity.type}")
        print(f"  Distance: {float(detailed_activity.distance) / 1000:.2f} km")
        moving_seconds = detailed_activity.moving_time.total_seconds() if hasattr(detailed_activity.moving_time, 'total_seconds') else int(detailed_activity.moving_time)
        print(f"  Moving time: {moving_seconds}s")

    except Exception as e:
        print(f"[ERROR] {e}")
        sys.exit(1)

    # Update activity in database
    print(f"\n[2/3] Updating activity in database...")
    detailed_activity.elevation_gain = detailed_activity.total_elevation_gain
    detailed_activity.subtype = detailed_activity.type

    from generator.db import update_or_create_activity
    created = update_or_create_activity(generator.session, detailed_activity)
    print(f"  {'Created' if created else 'Updated'} activity")

    # Sync laps
    print(f"\n[3/3] Syncing laps and streams...")
    generator.sync_activity_laps(activity_id)

    # Sync streams
    import time
    time.sleep(2)  # Rate limit delay
    generator.sync_activity_streams(activity_id)

    # Commit
    generator.session.commit()

    # Verify
    print(f"\n[VERIFY] Checking synced data...")
    from generator.db import ActivityLap, ActivityStream

    laps = generator.session.query(ActivityLap).filter_by(activity_id=activity_id).all()
    streams = generator.session.query(ActivityStream).filter_by(activity_id=activity_id).all()

    print(f"  Laps synced: {len(laps)}")
    for lap in laps:
        print(f"    Lap {lap.lap_index}: {lap.distance/1000:.2f}km, {lap.elapsed_time}s, HR:{lap.average_heartrate or 'N/A'}")

    print(f"  Stream types: {len(streams)}")
    for stream in streams:
        print(f"    {stream.stream_type}: {len(stream.stream_data or [])} points")

    # Regenerate activities.json
    print(f"\n[JSON] Regenerating activities.json...")
    activities_list = generator.load()
    with open(JSON_FILE, "w") as f:
        json.dump(activities_list, f, ensure_ascii=False, indent=2)

    # Find this activity in JSON
    activity_in_json = next((a for a in activities_list if a['run_id'] == activity_id), None)
    if activity_in_json:
        laps_count = len(activity_in_json.get('laps', []))
        streams_count = len(activity_in_json.get('streams', {}))
        print(f"  ✓ Activity written to activities.json")
        print(f"    Laps in JSON: {laps_count}")
        print(f"    Stream types in JSON: {streams_count}")

    print(f"\n{'='*70}")
    print(f"[SUCCESS] Activity {activity_id} synced!")
    print(f"{'='*70}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Sync a single Strava activity")
    parser.add_argument("activity_id", type=int, help="Strava activity ID to sync")
    args = parser.parse_args()

    sync_activity(args.activity_id)
