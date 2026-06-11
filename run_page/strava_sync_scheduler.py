#!/usr/bin/env python3
"""
Strava API Rate-Limited Sync Scheduler
Manages API calls with rate limiting, progress tracking, and batch execution.

Features:
- Calculates total API calls needed for full historical sync
- Respects Strava API rate limits (600/15min, 30000/day)
- Tracks progress in local JSON file
- Supports batched execution with configurable delays
- Handles retries and error management
"""

import json
import os
import sys
import time
import argparse
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict

# Add run_page to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import generator modules after paths are set
from generator.db import update_or_create_activity

# Strava API limits
STRAVA_RATE_LIMITS = {
    "per_15_minutes": 600,
    "per_day": 30000,
}

# API call costs per activity
API_CALL_COSTS = {
    "base_activity": 1,      # get_activities()
    "detailed_activity": 1,  # get_activity(id)
    "laps": 1,               # get_activity_laps(id)
    "streams": 1,            # get_activity_streams(id)
}

# Total cost per activity (full sync)
TOTAL_COST_PER_ACTIVITY = sum(API_CALL_COSTS.values())  # 4 calls per activity


@dataclass
class SyncProgress:
    """Tracks sync progress"""
    total_activities: int = 0
    completed: int = 0
    failed: int = 0
    skipped: int = 0
    current_batch: int = 0
    total_batches: int = 0
    started_at: Optional[str] = None
    last_updated: Optional[str] = None
    estimated_completion: Optional[str] = None
    api_calls_made: int = 0
    api_calls_remaining_today: int = STRAVA_RATE_LIMITS["per_day"]

    @property
    def remaining(self) -> int:
        return self.total_activities - self.completed - self.failed - self.skipped

    @property
    def progress_percentage(self) -> float:
        if self.total_activities == 0:
            return 0.0
        return round((self.completed + self.failed + self.skipped) / self.total_activities * 100, 2)

    def to_dict(self) -> dict:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict) -> 'SyncProgress':
        return cls(**{k: v for k, v in data.items() if k in cls.__annotations__})


class StravaSyncScheduler:
    """Manages Strava API sync with rate limiting and progress tracking"""

    def __init__(
        self,
        client_id: str,
        client_secret: str,
        refresh_token: str,
        progress_file: str = "strava_sync_progress.json",
        only_run: bool = True,
    ):
        self.client_id = client_id
        self.client_secret = client_secret
        self.refresh_token = refresh_token
        self.progress_file = progress_file
        self.only_run = only_run

        # Import generator after paths are set
        from generator import Generator
        from config import SQL_FILE

        self.generator = Generator(SQL_FILE)
        self.generator.set_strava_config(client_id, client_secret, refresh_token)
        self.generator.only_run = only_run

        self.progress = self._load_progress()

    def _load_progress(self) -> SyncProgress:
        """Load progress from file"""
        if os.path.exists(self.progress_file):
            try:
                with open(self.progress_file, 'r') as f:
                    data = json.load(f)
                return SyncProgress.from_dict(data)
            except Exception as e:
                print(f"Warning: Could not load progress file: {e}")
        return SyncProgress()

    def _save_progress(self):
        """Save progress to file"""
        self.progress.last_updated = datetime.now().isoformat()
        with open(self.progress_file, 'w') as f:
            json.dump(self.progress.to_dict(), f, indent=2)

    def estimate_api_calls(self, num_activities: int) -> dict:
        """Estimate API calls needed for sync"""
        return {
            "total_activities": num_activities,
            "calls_per_activity": TOTAL_COST_PER_ACTIVITY,
            "total_calls": num_activities * TOTAL_COST_PER_ACTIVITY,
            "breakdown": {
                "base_activity": num_activities * API_CALL_COSTS["base_activity"],
                "detailed_activity": num_activities * API_CALL_COSTS["detailed_activity"],
                "laps": num_activities * API_CALL_COSTS["laps"],
                "streams": num_activities * API_CALL_COSTS["streams"],
            }
        }

    def calculate_batch_plan(self, total_calls: int) -> dict:
        """Calculate optimal batch plan based on rate limits"""
        # Calculate how many activities we can sync per batch
        calls_per_15min = STRAVA_RATE_LIMITS["per_15_minutes"]
        calls_per_day = STRAVA_RATE_LIMITS["per_day"]

        # Activities per batch (respecting 15-min limit)
        activities_per_15min = calls_per_15min // TOTAL_COST_PER_ACTIVITY

        # Batches needed per day
        max_activities_per_day = calls_per_day // TOTAL_COST_PER_ACTIVITY

        # Total batches
        total_batches = (total_calls + calls_per_15min - 1) // calls_per_15min

        return {
            "activities_per_batch": activities_per_15min,
            "max_activities_per_day": max_activities_per_day,
            "total_batches": total_batches,
            "estimated_15min_periods": total_batches,
            "estimated_hours": (total_batches * 15) / 60,
        }

    def _fetch_with_retry(self, api_call, description, max_retries=3):
        """Fetch data with retry and rate limit handling"""
        import urllib3
        from requests.exceptions import SSLError, ProxyError, ConnectionError

        for attempt in range(max_retries):
            try:
                result = api_call()
                return result
            except Exception as e:
                error_str = str(e).lower()

                # Check for rate limit error (429)
                if "429" in error_str or "rate limit" in error_str:
                    print(f"  [WARN] Rate limit hit for {description} (attempt {attempt + 1}/{max_retries})")

                    # Try to extract wait time from error, otherwise use default
                    wait_time = 900  # Default 15 minutes
                    if attempt < max_retries - 1:
                        print(f"  Waiting {wait_time}s ({wait_time/60:.0f} min) before retry...")
                        countdown(wait_time, interval=60)
                        continue
                    else:
                        print(f"  [ERROR] {description} failed after {max_retries} attempts due to rate limiting")
                        return None

                # Check for SSL/Network errors
                is_ssl_error = isinstance(e, (SSLError, urllib3.exceptions.SSLError)) or 'ssl' in error_str
                is_proxy_error = isinstance(e, (ProxyError, urllib3.exceptions.ProxyError)) or 'proxy' in error_str
                is_connection_error = isinstance(e, (ConnectionError, urllib3.exceptions.ConnectionError)) or 'connection' in error_str

                if is_ssl_error or is_proxy_error or is_connection_error:
                    error_type = "SSL" if is_ssl_error else ("Proxy" if is_proxy_error else "Connection")
                    print(f"  [NETWORK] {error_type} error for {description} (attempt {attempt + 1}/{max_retries})")

                    if attempt < max_retries - 1:
                        wait_time = 30 * (2 ** attempt)
                        print(f"  Waiting {wait_time}s before retry...")
                        countdown(wait_time, interval=30)
                        continue
                    else:
                        print(f"  [ERROR] {description} failed after {max_retries} attempts due to network issues")
                        return None

                # Other errors
                print(f"  [ERROR] {description} failed: {e}")
                if attempt < max_retries - 1:
                    wait_time = 15 * (2 ** attempt)
                    print(f"  Retrying in {wait_time}s...")
                    countdown(wait_time, interval=15)
                else:
                    return None

        return None

    def preview_sync_plan(self):
        """Preview the sync plan without executing"""
        print("="*70)
        print("[INFO] Strava Sync Plan Preview")
        print("="*70)

        # Check access
        try:
            self.generator.check_access()
            print("[SUCCESS] Authentication successful\n")
        except Exception as e:
            print(f"[ERROR] Authentication failed: {e}\n")
            return

        # Get activity count with rate limit handling
        print("Fetching activity list...")
        activities = self._fetch_with_retry(
            lambda: list(self.generator.client.get_activities(
                before=datetime.now(timezone.utc)
            )),
            "activity list"
        )

        if activities is None:
            print("[ERROR] Failed to fetch activity list after retries.")
            print("Please wait 15-30 minutes and try again.")
            return

        if self.only_run:
            activities = [a for a in activities if a.type == "Run"]

        total = len(activities)
        print(f"Found {total} activities to sync\n")

        # Estimate API calls
        estimates = self.estimate_api_calls(total)
        print("API Call Estimates:")
        print(f"  Total activities: {estimates['total_activities']}")
        print(f"  Calls per activity: {estimates['calls_per_activity']}")
        print(f"  Total API calls needed: {estimates['total_calls']:,}")
        print()

        # Batch plan
        plan = self.calculate_batch_plan(estimates['total_calls'])
        print("Batch Plan:")
        print(f"  Activities per 15-min window: {plan['activities_per_batch']}")
        print(f"  Max activities per day: {plan['max_activities_per_day']}")
        print(f"  Total 15-min windows needed: {plan['total_batches']}")
        print(f"  Estimated time: {plan['estimated_hours']:.1f} hours")
        print()

        # Rate limit info
        print("Rate Limits:")
        print(f"  Strava limit: {STRAVA_RATE_LIMITS['per_15_minutes']} calls/15min, {STRAVA_RATE_LIMITS['per_day']} calls/day")
        print(f"  Current usage: {self.progress.api_calls_made} calls made")
        print(f"  Remaining today: {self.progress.api_calls_remaining_today}")
        print()

        if self.progress.started_at:
            print(f"Previous sync started: {self.progress.started_at}")
            print(f"Progress: {self.progress.completed}/{self.progress.total_activities} completed")
            print(f"Failed: {self.progress.failed}, Skipped: {self.progress.skipped}")
            print()

        print("="*70)
        print("To start sync, run with --execute flag")
        print("="*70)

    def execute_sync(self, batch_size: Optional[int] = None, delay_between_batches: int = 900, test_mode: bool = False):
        """Execute sync with rate limiting

        Args:
            batch_size: Number of activities per batch (auto-calculated if None)
            delay_between_batches: Seconds between batches (default 15 min = 900s)
            test_mode: If True, only sync the first activity for testing
        """
        print("="*70)
        if test_mode:
            print("[TEST MODE] Strava Sync - Single Activity Test")
        else:
            print("[START] Strava Sync with Rate Limiting")
        print("="*70)

        # Check access
        self.generator.check_access()

        # Get all activities with rate limit handling
        print("\nFetching activity list...")
        activities = self._fetch_with_retry(
            lambda: list(self.generator.client.get_activities(
                before=datetime.now(timezone.utc)
            )),
            "activity list",
            max_retries=5
        )

        if activities is None:
            print("[ERROR] Failed to fetch activity list after retries.")
            print("Please wait 15-30 minutes and try again.")
            return False

        if self.only_run:
            activities = [a for a in activities if a.type == "Run"]

        # In test mode, only process the first activity
        if test_mode:
            activities = activities[:1]
            print(f"[TEST] Limited to 1 activity for testing\n")

        # Initialize progress
        if not self.progress.started_at:
            self.progress.total_activities = len(activities)
            self.progress.started_at = datetime.now().isoformat()

            estimates = self.estimate_api_calls(len(activities))
            plan = self.calculate_batch_plan(estimates['total_calls'])
            self.progress.total_batches = plan['total_batches']
            self._save_progress()

        # Determine batch size
        if batch_size is None:
            estimates = self.estimate_api_calls(len(activities))
            plan = self.calculate_batch_plan(estimates['total_calls'])
            batch_size = plan['activities_per_batch']

        print(f"\nConfiguration:")
        print(f"  Total activities: {len(activities)}")
        print(f"  Batch size: {batch_size}")
        print(f"  Delay between batches: {delay_between_batches}s ({delay_between_batches/60:.1f}min)")

        # Process in batches
        for batch_start in range(0, len(activities), batch_size):
            batch_end = min(batch_start + batch_size, len(activities))
            batch = activities[batch_start:batch_end]
            batch_num = batch_start // batch_size + 1

            print(f"\n{'='*70}")
            print(f"[BATCH] Processing Batch {batch_num}/{(len(activities) + batch_size - 1) // batch_size}")
            print(f"  Activities: {batch_start + 1}-{batch_end} of {len(activities)}")
            print(f"{'='*70}")

            # Check rate limit
            if self.progress.api_calls_remaining_today <= len(batch) * TOTAL_COST_PER_ACTIVITY:
                print("\n[WARN] Daily rate limit approaching. Waiting for reset...")
                self._wait_for_daily_reset()

            # Process batch
            self._process_batch(batch, batch_num)

            self.progress.current_batch = batch_num
            self._save_progress()

            # Wait between batches (except for last batch)
            if batch_end < len(activities):
                print(f"\n[WAIT] Waiting {delay_between_batches}s before next batch...")
                countdown(delay_between_batches, interval=60)

        print(f"\n{'='*70}")
        print(f"[SUCCESS] Sync completed!")
        print(f"   Completed: {self.progress.completed}")
        print(f"   Failed: {self.progress.failed}")
        print(f"   Skipped: {self.progress.skipped}")
        print(f"   Total API calls: {self.progress.api_calls_made}")
        print(f"{'='*70}")

    def _process_batch(self, activities: List, batch_num: int):
        """Process a batch of activities"""
        from stravalib.exc import RateLimitExceeded

        for idx, activity in enumerate(activities, 1):
            activity_num = (batch_num - 1) * len(activities) + idx

            print(f"\n[{activity_num}/{self.progress.total_activities}] Processing activity {activity.id}")

            try:
                # Track API calls
                self.progress.api_calls_made += TOTAL_COST_PER_ACTIVITY
                self.progress.api_calls_remaining_today -= TOTAL_COST_PER_ACTIVITY

                # Sync activity with detailed data
                detailed_activity = self.generator._get_with_retry(
                    lambda: self.generator.client.get_activity(activity.id),
                    f"get activity {activity.id}"
                )

                if not detailed_activity:
                    print(f"  [ERROR] Failed to get detailed data")
                    self.progress.failed += 1
                    continue

                # Update activity in database
                detailed_activity.elevation_gain = detailed_activity.total_elevation_gain
                detailed_activity.subtype = detailed_activity.type

                created = update_or_create_activity(
                    self.generator.session,
                    detailed_activity
                )

                # Sync laps
                time.sleep(1)  # Small delay between API calls
                self.generator.sync_activity_laps(activity.id)

                # Sync streams
                time.sleep(1)  # Small delay between API calls
                self.generator.sync_activity_streams(activity.id)

                if created:
                    print(f"  [NEW] Activity synced")
                    self.progress.completed += 1
                else:
                    print(f"  [UPDATE] Activity updated")
                    self.progress.completed += 1

                # Save progress every 5 activities
                if idx % 5 == 0:
                    self._save_progress()

                # Show progress
                print(f"  Progress: {self.progress.completed}/{self.progress.total_activities} "
                      f"({self.progress.progress_percentage}%)")

            except Exception as e:
                print(f"  [ERROR] {e}")
                self.progress.failed += 1
                self._save_progress()

                # Continue with next activity
                continue

    def _wait_for_daily_reset(self):
        """Wait until daily rate limit resets"""
        now = datetime.now()
        tomorrow = now + timedelta(days=1)
        midnight = tomorrow.replace(hour=0, minute=0, second=0, microsecond=0)
        wait_seconds = (midnight - now).total_seconds()

        print(f"Waiting until midnight ({midnight.strftime('%H:%M:%S')}) for rate limit reset...")
        countdown(int(wait_seconds), interval=300)

    def reset_progress(self):
        """Reset progress tracking"""
        if os.path.exists(self.progress_file):
            os.remove(self.progress_file)
            print("Progress reset.")
        self.progress = SyncProgress()


def countdown(seconds: int, interval: int = 60):
    """Countdown timer with periodic updates

    Args:
        seconds: Total seconds to count down
        interval: How often to show progress (seconds)
    """
    end_time = time.time() + seconds
    shown_times = set()

    while time.time() < end_time:
        remaining = end_time - time.time()
        remaining_min = int(remaining // 60)
        remaining_sec = int(remaining % 60)

        # Show update at regular intervals
        elapsed = seconds - remaining
        if elapsed % interval < 1 or remaining < 60:
            print(f"\r  [WAIT] Time remaining: {remaining_min}m {remaining_sec}s  ", end='', flush=True)

        time.sleep(1)

    print("\r  [DONE] Wait complete!                                   ")


def main():
    parser = argparse.ArgumentParser(
        description="Strava Sync Scheduler with Rate Limiting",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Preview sync plan
  python strava_sync_scheduler.py --preview

  # Execute sync with default settings
  python strava_sync_scheduler.py --execute

  # Test mode: sync only first activity to verify script
  python strava_sync_scheduler.py --execute --test

  # Execute with custom batch size and delay
  python strava_sync_scheduler.py --execute --batch-size 5 --delay 1800

  # Reset progress
  python strava_sync_scheduler.py --reset
        """
    )

    parser.add_argument(
        "--preview",
        action="store_true",
        help="Preview sync plan without executing"
    )
    parser.add_argument(
        "--execute",
        action="store_true",
        help="Execute sync with rate limiting"
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=None,
        help="Number of activities per batch (auto-calculated if not specified)"
    )
    parser.add_argument(
        "--delay",
        type=int,
        default=900,
        help="Delay between batches in seconds (default: 900 = 15 min)"
    )
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Reset progress tracking"
    )
    parser.add_argument(
        "--progress-file",
        default="strava_sync_progress.json",
        help="Path to progress tracking file"
    )
    parser.add_argument(
        "--only-run",
        action="store_true",
        default=True,
        help="Only sync running activities (default: True)"
    )
    parser.add_argument(
        "--all-types",
        action="store_true",
        help="Sync all activity types (not just running)"
    )
    parser.add_argument(
        "--test",
        action="store_true",
        help="Test mode: only sync the first activity to verify script works"
    )

    args = parser.parse_args()

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
        print("Required: STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_REFRESH_TOKEN")
        sys.exit(1)

    # Create scheduler
    scheduler = StravaSyncScheduler(
        client_id=client_id,
        client_secret=client_secret,
        refresh_token=refresh_token,
        progress_file=args.progress_file,
        only_run=args.only_run and not args.all_types,
    )

    # Execute command
    if args.preview:
        scheduler.preview_sync_plan()
    elif args.execute:
        scheduler.execute_sync(
            batch_size=args.batch_size,
            delay_between_batches=args.delay,
            test_mode=args.test
        )
    elif args.reset:
        scheduler.reset_progress()
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
