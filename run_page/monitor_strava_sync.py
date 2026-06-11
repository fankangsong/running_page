#!/usr/bin/env python3
"""
Strava Sync Progress Monitor
Continuously monitors sync progress and displays real-time updates.
Usage: python monitor_strava_sync.py [--interval 30] [--file strava_sync_progress.json]
"""

import json
import time
import argparse
from datetime import datetime


def format_time(seconds: float) -> str:
    """Format seconds into human-readable time"""
    if seconds < 60:
        return f"{int(seconds)}s"
    elif seconds < 3600:
        minutes = int(seconds / 60)
        secs = int(seconds % 60)
        return f"{minutes}m {secs}s"
    else:
        hours = int(seconds / 3600)
        minutes = int((seconds % 3600) / 60)
        return f"{hours}h {minutes}m"


def monitor(progress_file: str = "strava_sync_progress.json", interval: int = 30):
    """Monitor sync progress"""
    print("="*70)
    print("Strava Sync Progress Monitor")
    print("="*70)
    print(f"Monitoring: {progress_file}")
    print(f"Update interval: {interval}s")
    print("Press Ctrl+C to stop\n")

    last_completed = -1
    start_time = time.time()

    try:
        while True:
            try:
                with open(progress_file, 'r') as f:
                    p = json.load(f)

                now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

                # Calculate ETA
                completed = p.get('completed', 0)
                total = p.get('total_activities', 0)
                remaining = p.get('remaining', total - completed)
                failed = p.get('failed', 0)
                skipped = p.get('skipped', 0)
                api_calls = p.get('api_calls_made', 0)
                current_batch = p.get('current_batch', 0)
                total_batches = p.get('total_batches', 0)

                # Progress bar
                if total > 0:
                    percentage = (completed + failed + skipped) / total * 100
                    bar_length = 40
                    filled = int(bar_length * percentage / 100)
                    bar = '#' * filled + '-' * (bar_length - filled)
                else:
                    percentage = 0
                    bar = '-' * 40

                # Calculate speed
                elapsed = time.time() - start_time
                if completed > 0 and completed != last_completed:
                    avg_time_per_activity = elapsed / completed
                    eta_seconds = remaining * avg_time_per_activity
                    eta_str = format_time(eta_seconds)
                    speed = completed / (elapsed / 60) if elapsed > 60 else completed / max(elapsed, 1) * 60
                else:
                    eta_str = "calculating..."
                    speed = 0

                # Display
                print(f"\r[{now}] Progress: [{bar}] {percentage:.1f}%")
                print(f"  Completed: {completed}/{total} (+{completed - last_completed if last_completed >= 0 else 0})")
                print(f"  Failed: {failed} | Skipped: {skipped} | Remaining: {remaining}")
                print(f"  API calls made: {api_calls:,}")
                print(f"  Speed: {speed:.1f} activities/min | ETA: {eta_str}")
                if total_batches > 0:
                    print(f"  Current batch: {current_batch}/{total_batches}")

                # Check if complete
                if remaining == 0 and total > 0:
                    print(f"\n{'='*70}")
                    print(f"[SUCCESS] Sync completed in {format_time(elapsed)}!")
                    print(f"   Total activities: {total}")
                    print(f"   Successfully synced: {completed}")
                    print(f"   Failed: {failed}")
                    print(f"   Skipped: {skipped}")
                    print(f"{'='*70}")
                    break

                last_completed = completed

            except FileNotFoundError:
                print(f"\r[WAIT] Waiting for sync to start... ({progress_file} not found)", end='', flush=True)
            except json.JSONDecodeError:
                print(f"\r[WARN] Reading progress file... (file may be updating)")
            except Exception as e:
                print(f"\r[ERROR] Error: {e}")

            time.sleep(interval)

    except KeyboardInterrupt:
        print(f"\n\n{'='*70}")
        print("[STOP] Monitoring stopped by user")
        print(f"{'='*70}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Monitor Strava sync progress")
    parser.add_argument("--interval", type=int, default=30, help="Update interval in seconds (default: 30)")
    parser.add_argument("--file", default="strava_sync_progress.json", help="Path to progress file")
    args = parser.parse_args()

    monitor(progress_file=args.file, interval=args.interval)
