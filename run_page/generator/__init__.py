import datetime
import os
import sys

import arrow
import stravalib
from gpxtrackposter import track_loader
from sqlalchemy import func

from polyline_processor import filter_out

from .db import Activity, ActivityLap, ActivityStream, init_db, update_or_create_activity, update_or_create_lap, update_or_create_stream

from synced_data_file_logger import save_synced_data_file_list

IGNORE_BEFORE_SAVING = os.getenv("IGNORE_BEFORE_SAVING", False)


class Generator:
    def __init__(self, db_path):
        self.client = stravalib.Client()
        self.session = init_db(db_path)

        self.client_id = ""
        self.client_secret = ""
        self.refresh_token = ""
        self.only_run = False

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

    def sync(self, force):
        """
        Sync activities means sync from strava
        TODO, better name later
        """
        self.check_access()

        print("Start syncing")
        if force:
            filters = {"before": datetime.datetime.now(datetime.timezone.utc)}
        else:
            last_activity = self.session.query(func.max(Activity.start_date)).scalar()
            if last_activity:
                last_activity_date = arrow.get(last_activity)
                last_activity_date = last_activity_date.shift(days=-7)
                filters = {"after": last_activity_date.datetime}
            else:
                filters = {"before": datetime.datetime.now(datetime.timezone.utc)}

        for activity in self.client.get_activities(**filters):
            if self.only_run and activity.type != "Run":
                continue
            if IGNORE_BEFORE_SAVING:
                if activity.map and activity.map.summary_polyline:
                    activity.map.summary_polyline = filter_out(
                        activity.map.summary_polyline
                    )
            #  strava use total_elevation_gain as elevation_gain
            activity.elevation_gain = activity.total_elevation_gain
            activity.subtype = activity.type

            # Update base activity data with new fields
            created = update_or_create_activity(self.session, activity)

            # Sync laps and streams
            try:
                self.sync_activity_laps(activity.id)
            except Exception as e:
                print(f"Laps sync error for {activity.id}: {e}")

            try:
                self.sync_activity_streams(activity.id)
            except Exception as e:
                print(f"Streams sync error for {activity.id}: {e}")

            if created:
                sys.stdout.write("+")
            else:
                sys.stdout.write(".")
            sys.stdout.flush()
        self.session.commit()

    def sync_activity_laps(self, activity_id):
        """同步单个活动的圈数数据"""
        try:
            laps = self.client.get_activity_laps(activity_id)
            lap_count = 0
            for idx, lap in enumerate(laps, start=1):
                update_or_create_lap(self.session, activity_id, lap, idx)
                lap_count += 1
            print(f"Synced {lap_count} laps for activity {activity_id}")
        except Exception as e:
            print(f"Failed to sync laps for {activity_id}: {str(e)}")

    def sync_activity_streams(self, activity_id):
        """同步单个活动的数据流"""
        try:
            stream_types = ['heartrate', 'velocity_smooth', 'altitude', 'distance', 'time']
            streams = self.client.get_activity_streams(
                activity_id,
                types=stream_types,
                resolution='low'
            )

            if streams:
                for stream_type in stream_types:
                    if hasattr(streams, stream_type):
                        stream_obj = getattr(streams, stream_type)
                        if stream_obj and hasattr(stream_obj, 'data'):
                            update_or_create_stream(
                                self.session,
                                activity_id,
                                stream_type,
                                list(stream_obj.data)
                            )
                print(f"Synced streams for activity {activity_id}")
        except Exception as e:
            print(f"Failed to sync streams for {activity_id}: {str(e)}")

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
