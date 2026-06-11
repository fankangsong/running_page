#!/usr/bin/env python3
"""
Handle Strava rate limit errors and provide guidance.
Usage: python handle_rate_limit.py
"""

import time
from datetime import datetime, timedelta


def countdown(seconds: int):
    """Countdown timer with updates"""
    end_time = time.time() + seconds
    while time.time() < end_time:
        remaining = end_time - time.time()
        minutes = int(remaining // 60)
        secs = int(remaining % 60)
        print(f"\r  Time remaining: {minutes}m {secs}s  ", end='', flush=True)
        time.sleep(1)
    print("\r  ✅ Ready to retry!                                   ")


def main():
    print("="*70)
    print("Strava Rate Limit Handler")
    print("="*70)
    print()
    print("[INFO] You've hit the Strava API rate limit.")
    print()
    print("Options:")
    print("  1. Wait 15 minutes (recommended)")
    print("  2. Wait 30 minutes (safer)")
    print("  3. Exit and try again later")
    print()

    choice = input("Select option (1/2/3): ").strip()

    if choice == "1":
        wait_time = 900  # 15 minutes
    elif choice == "2":
        wait_time = 1800  # 30 minutes
    else:
        print("\n[INFO] Exiting. Run the scheduler again when ready.")
        return

    print(f"\n[WAIT] Waiting {wait_time/60:.0f} minutes before retry...")
    print(f"[INFO] The scheduler will automatically retry after waiting.\n")

    countdown(wait_time)

    print("\n[SUCCESS] Rate limit should be reset now.")
    print("[ACTION] You can now run: python run_page/strava_sync_scheduler.py --preview\n")


if __name__ == "__main__":
    main()
