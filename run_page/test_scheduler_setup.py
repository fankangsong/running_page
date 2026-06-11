#!/usr/bin/env python3
"""
Test script to verify Strava sync scheduler installation
Usage: python test_scheduler_setup.py
"""

import os
import sys
import json


def check_file(filepath, description):
    """Check if file exists"""
    exists = os.path.exists(filepath)
    status = "OK" if exists else "MISSING"
    print(f"[{status}] {description}: {filepath}")
    return exists


def check_credentials():
    """Check if Strava credentials are configured"""
    env_path = os.path.join(os.path.dirname(__file__), '.env')

    if not os.path.exists(env_path):
        print("❌ .env file not found")
        return False

    # Parse .env
    env_vars = {}
    with open(env_path, 'r') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                env_vars[key.strip()] = value.strip().strip('"').strip("'")

    required = ["STRAVA_CLIENT_ID", "STRAVA_CLIENT_SECRET", "STRAVA_REFRESH_TOKEN"]
    missing = [k for k in required if k not in env_vars]

    if missing:
        print(f"[ERROR] Missing credentials: {', '.join(missing)}")
        return False

    print("[OK] Strava credentials configured")
    return True


def test_imports():
    """Test if required modules can be imported"""
    modules = [
        "stravalib",
        "sqlalchemy",
        "arrow",
    ]

    all_ok = True
    for module in modules:
        try:
            __import__(module)
            print(f"[OK] Module {module}")
        except ImportError as e:
            print(f"[ERROR] Module {module}: {e}")
            all_ok = False

    return all_ok


def main():
    print("="*70)
    print("Strava Sync Scheduler - Installation Check")
    print("="*70)
    print()

    checks = []

    # Check Python files
    print("Checking required files...")
    checks.append(check_file(
        os.path.join(os.path.dirname(__file__), 'run_page', 'strava_sync_scheduler.py'),
        "Scheduler script"
    ))
    checks.append(check_file(
        os.path.join(os.path.dirname(__file__), 'monitor_strava_sync.py'),
        "Monitor script"
    ))
    checks.append(check_file(
        os.path.join(os.path.dirname(__file__), 'start_strava_sync.ps1'),
        "PowerShell launcher"
    ))
    checks.append(check_file(
        os.path.join(os.path.dirname(__file__), 'STRAVA_SCHEDULER_GUIDE.md'),
        "User guide"
    ))
    checks.append(check_file(
        os.path.join(os.path.dirname(__file__), 'STRAVA_QUICKSTART.md'),
        "Quick start guide"
    ))
    print()

    # Check credentials
    print("Checking credentials...")
    checks.append(check_credentials())
    print()

    # Check imports
    print("Checking Python modules...")
    checks.append(test_imports())
    print()

    # Summary
    print("="*70)
    if all(checks):
        print("[SUCCESS] All checks passed! Ready to use Strava sync scheduler.")
        print()
        print("Next steps:")
        print("  1. Preview sync plan:")
        print("     python run_page/strava_sync_scheduler.py --preview")
        print()
        print("  2. Execute sync:")
        print("     python run_page/strava_sync_scheduler.py --execute")
        print()
        print("  3. Monitor progress:")
        print("     python monitor_strava_sync.py")
    else:
        print("[ERROR] Some checks failed. Please fix the issues above.")
        print()
        print("Troubleshooting:")
        print("  - Install dependencies: pip install -r requirements.txt")
        print("  - Configure credentials: Add STRAVA_* to .env file")
        print("  - Check file paths: Ensure all scripts are in correct locations")
    print("="*70)


if __name__ == "__main__":
    main()
