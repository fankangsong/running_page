import datetime
import os
import random
import sys
import time
import urllib3

# Add run_page to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import arrow
import stravalib
from gpxtrackposter import track_loader
from requests.exceptions import SSLError, ProxyError, ConnectionError
from sqlalchemy import func

from polyline_processor import filter_out

from .db import Activity, ActivityLap, ActivityStream, init_db, update_or_create_activity, update_or_create_lap, update_or_create_stream

from synced_data_file_logger import save_synced_data_file_list

IGNORE_BEFORE_SAVING = os.getenv("IGNORE_BEFORE_SAVING", False)

# Strava API rate limiting settings
STRAVA_RATE_LIMIT_DELAY = 5  # seconds between requests to avoid rate limiting (increased from 3 to 5 due to 429 errors)
MAX_RETRIES = 5  # maximum number of retries for failed requests
RETRY_DELAY = 15  # initial delay in seconds before retry (exponential backoff)
RATE_LIMIT_RETRY_DELAY = 120  # seconds to wait when hitting rate limit (429 error, increased from 90)
REQUEST_COUNTER = 0  # global request counter for tracking

# Dynamic rate limits (will be updated from API response headers)
# Default to conservative limits; will auto-adjust if higher limits detected
STRAVA_RATE_LIMITS = {
    "per_15_minutes": 200,  # default overall limit
    "per_day": 2000,        # default overall limit
}
STRAVA_READ_RATE_LIMITS = {
    "per_15_minutes": 100,  # default read (non-upload) limit
    "per_day": 1000,        # default read (non-upload) limit
}


def update_rate_limits_from_headers(response_headers: dict):
    """Update rate limits based on API response headers"""
    global STRAVA_RATE_LIMITS, STRAVA_READ_RATE_LIMITS

    # Parse X-RateLimit-Limit: "15min_limit,daily_limit"
    if 'X-Ratelimit-Limit' in response_headers:
        try:
            limit_str = response_headers['X-Ratelimit-Limit']
            parts = [int(x.strip()) for x in limit_str.split(',')]
            if len(parts) == 2:
                STRAVA_RATE_LIMITS["per_15_minutes"] = parts[0]
                STRAVA_RATE_LIMITS["per_day"] = parts[1]
        except (ValueError, IndexError):
            pass

    # Parse X-ReadRateLimit-Limit: "15min_limit,daily_limit"
    if 'X-Readratelimit-Limit' in response_headers:
        try:
            limit_str = response_headers['X-Readratelimit-Limit']
            parts = [int(x.strip()) for x in limit_str.split(',')]
            if len(parts) == 2:
                STRAVA_READ_RATE_LIMITS["per_15_minutes"] = parts[0]
                STRAVA_READ_RATE_LIMITS["per_day"] = parts[1]
        except (ValueError, IndexError):
            pass


def get_api_usage_from_headers(response_headers: dict) -> dict:
    """Extract API usage from response headers"""
    usage = {}

    # Parse X-RateLimit-Usage: "15min_usage,daily_usage"
    if 'X-Ratelimit-Usage' in response_headers:
        try:
            usage_str = response_headers['X-Ratelimit-Usage']
            parts = [int(x.strip()) for x in usage_str.split(',')]
            if len(parts) == 2:
                usage['overall_15min'] = parts[0]
                usage['overall_daily'] = parts[1]
        except (ValueError, IndexError):
            pass

    # Parse X-ReadRateLimit-Usage: "15min_usage,daily_usage"
    if 'X-Readratelimit-Usage' in response_headers:
        try:
            usage_str = response_headers['X-Readratelimit-Usage']
            parts = [int(x.strip()) for x in usage_str.split(',')]
            if len(parts) == 2:
                usage['read_15min'] = parts[0]
                usage['read_daily'] = parts[1]
        except (ValueError, IndexError):
            pass

    return usage


class Generator:
    def __init__(self, db_path):
        self.client = stravalib.Client()
        self.session = init_db(db_path)

        self.client_id = ""
        self.client_secret = ""
        self.refresh_token = ""
        self.only_run = False

        # Track API usage from response headers
        self.api_usage = {
            'overall_15min': 0,
            'overall_daily': 0,
            'read_15min': 0,
            'read_daily': 0,
        }

        # Install response hook to capture rate limit headers
        self._install_response_hook()

    def _install_response_hook(self):
        """Install a hook on the requests session to capture API response headers"""
        def capture_rate_limit_headers(response, *args, **kwargs):
            """Hook callback to extract and store rate limit info from response headers"""
            try:
                # Update rate limits from headers
                update_rate_limits_from_headers(response.headers)

                # Update API usage tracking
                usage = get_api_usage_from_headers(response.headers)
                if usage:
                    self.api_usage.update(usage)
            except Exception as e:
                # Don't let hook errors break the main flow
                pass
            return response

        # Register the hook on the protocol's requests session
        try:
            self.client.protocol.rsession.hooks['response'].append(capture_rate_limit_headers)
        except Exception:
            pass  # If hook installation fails, continue without it

    def set_strava_config(self, client_id, client_secret, refresh_token):
        self.client_id = client_id
        self.client_secret = client_secret
        self.refresh_token = refresh_token

    def check_access(self):
        response = self.client.refresh_access_token(
            client_id=self.client_id,
            client_secret=self.client_secret,
            refresh_token=self.refresh_token,
        )
        # Update the authdata object
        self.access_token = response["access_token"]
        self.refresh_token = response["refresh_token"]

        self.client.access_token = response["access_token"]
        print("Access ok")

        # After token refresh, we should have updated rate limits from any previous API calls
        print(f"Rate limits: {STRAVA_RATE_LIMITS['per_15_minutes']}/15min, {STRAVA_RATE_LIMITS['per_day']}/day")
        print(f"Read limits: {STRAVA_READ_RATE_LIMITS['per_15_minutes']}/15min, {STRAVA_READ_RATE_LIMITS['per_day']}/day")

    def sync(self, force, sync_historical=False):
        """
        Sync activities means sync from strava
        TODO, better name later

        Args:
            force: Force sync all activities
            sync_historical: If True, sync all historical data with detailed fields
        """
        global REQUEST_COUNTER
        self.check_access()

        print("Start syncing")
        if force or sync_historical:
            filters = {"before": datetime.datetime.now(datetime.timezone.utc)}
            print("📊 Mode: Full historical sync (all activities)")
        else:
            last_activity = self.session.query(func.max(Activity.start_date)).scalar()
            if last_activity:
                last_activity_date = arrow.get(last_activity)
                last_activity_date = last_activity_date.shift(days=-7)
                filters = {"after": last_activity_date.datetime}
                print(f"📊 Mode: Incremental sync (activities after {last_activity_date.format('YYYY-MM-DD')})")
            else:
                filters = {"before": datetime.datetime.now(datetime.timezone.utc)}
                print("📊 Mode: First sync (will fetch all activities)")

        activity_count = 0
        synced_count = 0
        updated_count = 0
        skipped_count = 0
        error_count = 0

        for activity in self.client.get_activities(**filters):
            activity_count += 1
            if self.only_run and activity.type != "Run":
                skipped_count += 1
                continue

            # Rate limiting delay
            time.sleep(STRAVA_RATE_LIMIT_DELAY)

            if IGNORE_BEFORE_SAVING:
                if activity.map and activity.map.summary_polyline:
                    activity.map.summary_polyline = filter_out(
                        activity.map.summary_polyline
                    )
            #  strava use total_elevation_gain as elevation_gain
            activity.elevation_gain = activity.total_elevation_gain
            activity.subtype = activity.type

            try:
                # Get detailed activity data with retries
                detailed_activity = self._get_with_retry(
                    lambda: self.client.get_activity(activity.id),
                    f"get activity {activity.id}"
                )

                if not detailed_activity:
                    print(f"\nFailed to get detailed data for activity {activity.id}, skipping")
                    error_count += 1
                    sys.stdout.write("!")
                    sys.stdout.flush()
                    continue

                # Update base activity data with detailed fields
                created = update_or_create_activity(self.session, detailed_activity)
                if created:
                    synced_count += 1
                else:
                    updated_count += 1

                # Sync laps and streams (with rate limiting)
                time.sleep(STRAVA_RATE_LIMIT_DELAY)
                self.sync_activity_laps(activity.id)

                time.sleep(STRAVA_RATE_LIMIT_DELAY)
                self.sync_activity_streams(activity.id)

                if created:
                    sys.stdout.write("+")
                else:
                    sys.stdout.write(".")
                sys.stdout.flush()

                # Progress indicator every 10 activities
                if activity_count % 10 == 0:
                    print(f"\n[{activity_count} processed] (+{synced_count} new, .{updated_count} updated, !{error_count} errors) | Requests: {REQUEST_COUNTER}")

            except Exception as e:
                # Rollback on error and continue with next activity
                print(f"\nError syncing activity {activity.id}: {e}")
                error_count += 1
                self.session.rollback()
                sys.stdout.write("!")
                sys.stdout.flush()
                continue

        print(f"\n\n{'='*60}")
        print(f"✅ Sync completed!")
        print(f"   Total activities fetched: {activity_count}")
        print(f"   New activities synced: {synced_count}")
        print(f"   Existing activities updated: {updated_count}")
        print(f"   Skipped (non-running): {skipped_count}")
        print(f"   Errors: {error_count}")
        print(f"   Total API requests: {REQUEST_COUNTER}")
        print(f"{'='*60}")
        self.session.commit()

    def _get_with_retry(self, api_call, description="API call"):
        """
        Helper method to make API calls with exponential backoff retry logic
        Handles rate limiting (429 errors) and network errors specially
        """
        global REQUEST_COUNTER
        import urllib3
        from requests.exceptions import SSLError, ProxyError, ConnectionError

        for attempt in range(MAX_RETRIES):
            try:
                REQUEST_COUNTER += 1
                result = api_call()
                # Log progress every 50 requests
                if REQUEST_COUNTER % 50 == 0:
                    print(f"\n  [Request #{REQUEST_COUNTER}] {description} completed")
                return result
            except Exception as e:
                error_str = str(e).lower()

                # Check for rate limit error (429)
                if "429" in error_str or "rate limit" in error_str:
                    print(f"  ⚠️  Rate limit hit for {description} (attempt {attempt + 1}/{MAX_RETRIES})")
                    if attempt < MAX_RETRIES - 1:
                        delay = RATE_LIMIT_RETRY_DELAY
                        print(f"  Waiting {delay} seconds before retry...")
                        time.sleep(delay)
                        continue
                    else:
                        print(f"  ❌ {description} failed after {MAX_RETRIES} attempts due to rate limiting")
                        return None

                # Check for SSL/Network errors - use longer initial delay
                is_ssl_error = isinstance(e, (SSLError, urllib3.exceptions.SSLError)) or 'ssl' in error_str or 'ssleoferror' in error_str
                is_proxy_error = isinstance(e, (ProxyError, urllib3.exceptions.ProxyError)) or 'proxy' in error_str
                is_connection_error = isinstance(e, (ConnectionError, urllib3.exceptions.ConnectionError)) or 'connection' in error_str

                if is_ssl_error or is_proxy_error or is_connection_error:
                    error_type = "SSL" if is_ssl_error else ("Proxy" if is_proxy_error else "Connection")
                    print(f"  🌐 {error_type} error for {description} (attempt {attempt + 1}/{MAX_RETRIES})")

                    if attempt < MAX_RETRIES - 1:
                        # For network errors, use much longer delays and add jitter
                        base_delay = 30  # Start with 30 seconds for network issues
                        delay = base_delay * (2 ** attempt) + random.uniform(0, 10)  # Add jitter
                        print(f"  Network issue detected, waiting {delay:.0f}s before retry...")
                        time.sleep(delay)

                        # On first network error, suggest checking connection
                        if attempt == 0:
                            print(f"  💡 Tip: Check your network connection or try disabling VPN/proxy")
                        continue
                    else:
                        print(f"  ❌ {description} failed after {MAX_RETRIES} attempts due to network issues")
                        return None

                # For other errors, use standard exponential backoff
                if attempt < MAX_RETRIES - 1:
                    delay = RETRY_DELAY * (2 ** attempt)
                    print(f"  {description} failed (attempt {attempt + 1}/{MAX_RETRIES}): {e}")
                    print(f"  Retrying in {delay} seconds...")
                    time.sleep(delay)
                else:
                    print(f"  ❌ {description} failed after {MAX_RETRIES} attempts: {e}")
                    return None

    def sync_activity_laps(self, activity_id):
        """同步单个活动的圈数数据"""
        try:
            laps = self._get_with_retry(
                lambda: self.client.get_activity_laps(activity_id),
                f"get laps for activity {activity_id}"
            )

            if not laps:
                print(f"  No laps data for activity {activity_id}")
                return

            lap_count = 0
            for idx, lap in enumerate(laps, start=1):
                update_or_create_lap(self.session, activity_id, lap, idx)
                lap_count += 1
            print(f"  Synced {lap_count} laps for activity {activity_id}")
        except Exception as e:
            print(f"  Failed to sync laps for {activity_id}: {str(e)}")

    def sync_activity_streams(self, activity_id):
        """同步单个活动的数据流"""
        try:
            stream_types = ['heartrate', 'velocity_smooth', 'altitude', 'distance', 'time']
            streams = self.client.get_activity_streams(
                activity_id,
                types=stream_types,
                resolution='high'
            )

            if streams:
                synced_count = 0
                # Debug: streams 是字典结构 { 'heartrate': Stream, ... }
                print(f"Streams keys: {list(streams.keys())}")

                for stream_type in stream_types:
                    # streams 是字典，用 key 访问
                    stream_obj = streams.get(stream_type)

                    if stream_obj:
                        # Stream 对象有 .data 属性
                        data = None
                        if hasattr(stream_obj, 'data'):
                            data = list(stream_obj.data) if stream_obj.data else None
                        elif isinstance(stream_obj, list):
                            data = stream_obj

                        if data and len(data) > 0:
                            update_or_create_stream(
                                self.session,
                                activity_id,
                                stream_type,
                                data
                            )
                            synced_count += 1
                            print(f"  Saved {stream_type}: {len(data)} points")
                        else:
                            print(f"  No data for {stream_type}")

                print(f"Synced {synced_count} stream types for activity {activity_id}")
            else:
                print(f"No streams returned for activity {activity_id}")
        except Exception as e:
            import traceback
            print(f"Failed to sync streams for {activity_id}: {str(e)}")
            traceback.print_exc()

    def sync_from_data_dir(self, data_dir, file_suffix="gpx", activity_title_dict={}):
        loader = track_loader.TrackLoader()
        tracks = loader.load_tracks(
            data_dir, file_suffix=file_suffix, activity_title_dict=activity_title_dict
        )
        print(f"load {len(tracks)} tracks")
        if not tracks:
            print("No tracks found.")
            return

        synced_files = []

        for t in tracks:
            created = update_or_create_activity(
                self.session, t.to_namedtuple(run_from=file_suffix)
            )
            if created:
                sys.stdout.write("+")
            else:
                sys.stdout.write(".")
            synced_files.extend(t.file_names)
            sys.stdout.flush()

        save_synced_data_file_list(synced_files)

        self.session.commit()

    def sync_from_app(self, app_tracks):
        if not app_tracks:
            print("No tracks found.")
            return
        print("Syncing tracks '+' means new track '.' means update tracks")
        synced_files = []
        for t in app_tracks:
            created = update_or_create_activity(self.session, t)
            if created:
                sys.stdout.write("+")
            else:
                sys.stdout.write(".")
            if "file_names" in t:
                synced_files.extend(t.file_names)
            sys.stdout.flush()

        self.session.commit()

    def load(self):
        # if sub_type is not in the db, just add an empty string to it
        query = self.session.query(Activity).filter(Activity.distance > 0.1)
        if self.only_run:
            query = query.filter(Activity.type == "Run")

        activities = query.order_by(Activity.start_date_local)
        activity_list = []

        streak = 0
        last_date = None
        for activity in activities:
            # Determine running streak.
            date = datetime.datetime.strptime(
                activity.start_date_local, "%Y-%m-%d %H:%M:%S"  # type: ignore
            ).date()
            if last_date is None:
                streak = 1
            elif date == last_date:
                pass
            elif date == last_date + datetime.timedelta(days=1):
                streak += 1
            else:
                assert date > last_date
                streak = 1
            activity.streak = streak  # type: ignore
            last_date = date
            if not IGNORE_BEFORE_SAVING:
                activity.summary_polyline = filter_out(activity.summary_polyline)  # type: ignore

            # 获取基础字典
            activity_dict = activity.to_dict()

            # 关联查询 laps
            laps = self.session.query(ActivityLap).filter_by(
                activity_id=activity.run_id
            ).order_by(ActivityLap.lap_index).all()
            activity_dict["laps"] = [lap.to_dict() for lap in laps]

            # 关联查询 streams
            streams = self.session.query(ActivityStream).filter_by(
                activity_id=activity.run_id
            ).all()
            streams_dict = {}
            for stream in streams:
                streams_dict[stream.stream_type] = stream.to_dict()
            activity_dict["streams"] = streams_dict

            activity_list.append(activity_dict)

        return activity_list

    def get_old_tracks_ids(self):
        try:
            activities = self.session.query(Activity).all()
            return [str(a.run_id) for a in activities]
        except Exception as e:
            # pass the error
            print(f"something wrong with {str(e)}")
            return []

    def get_old_tracks_dates(self):
        try:
            activities = (
                self.session.query(Activity)
                .order_by(Activity.start_date_local.desc())
                .all()
            )
            return [str(a.start_date_local) for a in activities]
        except Exception as e:
            # pass the error
            print(f"something wrong with {str(e)}")
            return []
