#!/usr/bin/env python3
"""
Strava connection diagnostic script
Tests network connectivity to Strava API before running sync
"""
import sys
import time
import urllib3
from requests.exceptions import SSLError, ProxyError, ConnectionError

def parse_env_file(env_path='.env'):
    """Parse .env file manually without python-dotenv"""
    import os
    env_vars = {}
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    env_vars[key.strip()] = value.strip().strip('"').strip("'")
    return env_vars

def test_basic_connectivity():
    """Test basic internet connectivity"""
    print("1. Testing basic internet connectivity...")
    try:
        http = urllib3.PoolManager(timeout=5.0)
        response = http.request('GET', 'https://httpbin.org/get')
        if response.status == 200:
            print("   ✅ Basic internet connectivity: OK")
            return True
        else:
            print(f"   ❌ Basic internet connectivity: Failed (status {response.status})")
            return False
    except Exception as e:
        print(f"   ❌ Basic internet connectivity: Failed ({e})")
        return False

def test_strava_api():
    """Test Strava API endpoint"""
    print("\n2. Testing Strava API endpoint...")
    try:
        http = urllib3.PoolManager(
            timeout=10.0,
            cert_reqs='CERT_REQUIRED'
        )
        response = http.request('GET', 'https://www.strava.com/api/v3/athlete')
        print(f"   ✅ Strava API reachable (status {response.status})")
        return True
    except SSLError as e:
        print(f"   ❌ Strava API SSL error: {e}")
        print("   💡 This suggests SSL certificate issues or proxy interference")
        return False
    except ProxyError as e:
        print(f"   ❌ Strava API proxy error: {e}")
        print("   💡 Check your proxy/VPN settings")
        return False
    except ConnectionError as e:
        print(f"   ❌ Strava API connection error: {e}")
        print("   💡 Check your internet connection")
        return False
    except Exception as e:
        print(f"   ❌ Strava API error: {e}")
        return False

def test_strava_auth():
    """Test Strava authentication"""
    print("\n3. Testing Strava authentication...")
    env_vars = parse_env_file()

    client_id = env_vars.get("STRAVA_CLIENT_ID")
    client_secret = env_vars.get("STRAVA_CLIENT_SECRET")
    refresh_token = env_vars.get("STRAVA_REFRESH_TOKEN")

    if not all([client_id, client_secret, refresh_token]):
        print("   ❌ Missing credentials in .env file")
        return False

    print(f"   Client ID: {client_id[:5]}...{client_id[-5:]}")
    print(f"   Refresh Token: {refresh_token[:5]}...{refresh_token[-5:]}")

    try:
        import stravalib
        client = stravalib.Client()

        print("   Attempting to refresh access token...")
        response = client.refresh_access_token(
            client_id=int(client_id),
            client_secret=client_secret,
            refresh_token=refresh_token
        )

        if 'access_token' in response:
            print("   ✅ Authentication: OK")
            print(f"   Access token obtained: {response['access_token'][:10]}...")
            return True
        else:
            print("   ❌ Authentication: Failed (no access_token in response)")
            return False
    except Exception as e:
        print(f"   ❌ Authentication: Failed ({e})")
        if "invalid_grant" in str(e).lower():
            print("   💡 Refresh token may be expired, need to re-authorize")
        return False

def test_api_call():
    """Test actual API call to get activities"""
    print("\n4. Testing activity fetch (first page)...")
    env_vars = parse_env_file()

    try:
        import stravalib
        client = stravalib.Client()

        # Authenticate
        response = client.refresh_access_token(
            client_id=int(env_vars["STRAVA_CLIENT_ID"]),
            client_secret=env_vars["STRAVA_CLIENT_SECRET"],
            refresh_token=env_vars["STRAVA_REFRESH_TOKEN"]
        )
        client.access_token = response['access_token']

        print("   Fetching first activity...")
        activities = list(client.get_activities(limit=1))

        if activities:
            activity = activities[0]
            print(f"   ✅ Activity fetch: OK")
            print(f"   Activity ID: {activity.id}")
            print(f"   Activity Name: {activity.name}")
            print(f"   Activity Type: {activity.type}")
            return True
        else:
            print("   ⚠️  No activities found")
            return True
    except Exception as e:
        print(f"   ❌ Activity fetch: Failed ({e})")
        return False

def main():
    print("="*60)
    print("🔍 Strava Connection Diagnostic Tool")
    print("="*60)
    print()

    results = []

    # Run tests
    results.append(("Internet Connectivity", test_basic_connectivity()))
    results.append(("Strava API Reachability", test_strava_api()))
    results.append(("Strava Authentication", test_strava_auth()))
    results.append(("Activity Fetch", test_api_call()))

    # Summary
    print("\n" + "="*60)
    print("📊 Diagnostic Summary")
    print("="*60)

    passed = sum(1 for _, result in results if result)
    total = len(results)

    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name:.<40} {status}")

    print("="*60)
    print(f"Result: {passed}/{total} tests passed")

    if passed == total:
        print("\n🎉 All tests passed! You can run the sync.")
        print("   Command: python run_strava_sync.py --historical")
    else:
        print("\n⚠️  Some tests failed. Please fix the issues above.")
        print("\nCommon solutions:")
        print("  - Check your internet connection")
        print("  - Disable VPN/proxy if using one")
        print("  - Verify .env credentials are correct")
        print("  - Try again later if Strava API is down")

    print("="*60)

if __name__ == "__main__":
    main()
