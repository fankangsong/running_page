#!/usr/bin/env python3
"""
Strava sync script that reads credentials from .env file

Two modes available:
1. Simple mode (original): python run_strava_sync.py [--historical]
2. Scheduled mode (with rate limiting): python run_strava_sync.py --scheduled [--execute|--preview]

Scheduled mode features:
- API call planning and estimation
- Rate limit management (600/15min, 30000/day)
- Progress tracking to local JSON file
- Batched execution with configurable delays
"""
import os
import sys

# Add run_page to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'run_page'))

def parse_env_file(env_path='.env'):
    """Parse .env file manually without python-dotenv"""
    env_vars = {}
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    env_vars[key.strip()] = value.strip().strip('"').strip("'")
    return env_vars

# Load environment variables from .env file
env_vars = parse_env_file()

# Get Strava credentials
STRAVA_CLIENT_ID = env_vars.get("STRAVA_CLIENT_ID")
STRAVA_CLIENT_SECRET = env_vars.get("STRAVA_CLIENT_SECRET")
STRAVA_REFRESH_TOKEN = env_vars.get("STRAVA_REFRESH_TOKEN")

if not all([STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_REFRESH_TOKEN]):
    print("❌ Error: Missing Strava credentials in .env file")
    print("Required: STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_REFRESH_TOKEN")
    sys.exit(1)

if __name__ == "__main__":
    # Check if using scheduled mode
    if "--scheduled" in sys.argv or "--scheduler" in sys.argv:
        from strava_sync_scheduler import main as scheduler_main
        scheduler_main()
    else:
        # Original simple mode
        from strava_sync import run_strava_sync

        historical = "--historical" in sys.argv

        print("="*60)
        print("🏃 Strava Sync - Historical Data")
        print("="*60)
        print(f"Client ID: {STRAVA_CLIENT_ID}")
        print(f"Historical mode: {'Yes' if historical else 'No (last 7 days only)'}")
        print("="*60)
        print()

        run_strava_sync(
            client_id=STRAVA_CLIENT_ID,
            client_secret=STRAVA_CLIENT_SECRET,
            refresh_token=STRAVA_REFRESH_TOKEN,
            historical=historical,
        )
