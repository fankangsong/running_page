import datetime
import random
import string

from geopy.geocoders import options, Nominatim
from sqlalchemy import (
    Column,
    Float,
    Integer,
    Interval,
    String,
    create_engine,
    inspect,
    text,
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

Base = declarative_base()


# random user name 8 letters
def randomword():
    letters = string.ascii_lowercase
    return "".join(random.choice(letters) for i in range(4))


options.default_user_agent = "running_page"
# reverse the location (lat, lon) -> location detail
g = Nominatim(user_agent=randomword())


ACTIVITY_KEYS = [
    "run_id",
    "name",
    "distance",
    "moving_time",
    "elapsed_time",
    "type",
    "subtype",
    "start_date",
    "start_date_local",
    "location_country",
    "summary_polyline",
    "average_heartrate",
    "max_heartrate",
    "average_speed",
    "max_speed",
    "average_cadence",
    "calories",
    "device_name",
    "elevation_gain",
    "elev_high",
    "elev_low",
]


class Activity(Base):
    __tablename__ = "activities"

    run_id = Column(Integer, primary_key=True)
    name = Column(String)
    distance = Column(Float)
    moving_time = Column(Interval)
    elapsed_time = Column(Interval)
    type = Column(String)
    subtype = Column(String)
    start_date = Column(String)
    start_date_local = Column(String)
    location_country = Column(String)
    summary_polyline = Column(String)
    average_heartrate = Column(Float)
    # 新增字段
    max_heartrate = Column(Float)
    average_speed = Column(Float)
    max_speed = Column(Float)
    average_cadence = Column(Float)
    calories = Column(Float)
    device_name = Column(String)
    elevation_gain = Column(Float)
    elev_high = Column(Float)
    elev_low = Column(Float)
    streak = None

    def to_dict(self):
        out = {}
        for key in ACTIVITY_KEYS:
            attr = getattr(self, key)
            if isinstance(attr, (datetime.timedelta, datetime.datetime)):
                out[key] = str(attr)
            else:
                out[key] = attr

        if self.streak:
            out["streak"] = self.streak

        return out


class ActivityLap(Base):
    __tablename__ = "activity_laps"

    id = Column(Integer, primary_key=True, autoincrement=True)
    activity_id = Column(Integer, index=True)  # 关联 activities.run_id
    lap_index = Column(Integer)
    distance = Column(Float)
    elapsed_time = Column(Integer)  # 秒
    moving_time = Column(Integer)  # 秒
    average_speed = Column(Float)
    average_heartrate = Column(Float)
    total_elevation_gain = Column(Float)
    start_date = Column(String)

    def to_dict(self):
        return {
            "lap_index": self.lap_index,
            "distance": self.distance,
            "elapsed_time": self.elapsed_time,
            "moving_time": self.moving_time,
            "average_speed": self.average_speed,
            "average_heartrate": self.average_heartrate,
            "total_elevation_gain": self.total_elevation_gain,
            "start_date": self.start_date,
        }


class ActivityStream(Base):
    __tablename__ = "activity_streams"

    id = Column(Integer, primary_key=True, autoincrement=True)
    activity_id = Column(Integer, index=True)  # 关联 activities.run_id
    stream_type = Column(String)  # heartrate/velocity_smooth/altitude/distance/time
    data = Column(String)  # JSON 数组

    def to_dict(self):
        import json
        try:
            return json.loads(self.data) if self.data else []
        except json.JSONDecodeError:
            return []


def update_or_create_activity(session, run_activity):
    created = False
    try:
        activity = (
            session.query(Activity).filter_by(run_id=int(run_activity.id)).first()
        )

        current_elevation_gain = 0.0  # default value

        # https://github.com/stravalib/stravalib/blob/main/src/stravalib/strava_model.py#L639C1-L643C41
        if (
            hasattr(run_activity, "total_elevation_gain")
            and run_activity.total_elevation_gain is not None
        ):
            current_elevation_gain = float(run_activity.total_elevation_gain)
        elif (
            hasattr(run_activity, "elevation_gain")
            and run_activity.elevation_gain is not None
        ):
            current_elevation_gain = float(run_activity.elevation_gain)

        if not activity:
            start_point = run_activity.start_latlng
            location_country = getattr(run_activity, "location_country", "")
            # or China for #176 to fix
            if not location_country and start_point or location_country == "China":
                try:
                    location_country = str(
                        g.reverse(
                            f"{start_point.lat}, {start_point.lon}", language="zh-CN"  # type: ignore
                        )
                    )
                # limit (only for the first time)
                except Exception:
                    try:
                        location_country = str(
                            g.reverse(
                                f"{start_point.lat}, {start_point.lon}",
                                language="zh-CN",  # type: ignore
                            )
                        )
                    except Exception:
                        pass

            activity = Activity(
                run_id=run_activity.id,
                name=run_activity.name,
                distance=run_activity.distance,
                moving_time=run_activity.moving_time,
                elapsed_time=run_activity.elapsed_time,
                type=run_activity.type,
                subtype=run_activity.subtype,
                start_date=run_activity.start_date,
                start_date_local=run_activity.start_date_local,
                location_country=location_country,
                summary_polyline=(
                    run_activity.map and run_activity.map.summary_polyline or ""
                ),
                average_heartrate=run_activity.average_heartrate,
                max_heartrate=getattr(run_activity, 'max_heartrate', None),
                average_speed=float(run_activity.average_speed),
                max_speed=getattr(run_activity, 'max_speed', None) if hasattr(run_activity, 'max_speed') and run_activity.max_speed else None,
                average_cadence=getattr(run_activity, 'average_cadence', None),
                calories=getattr(run_activity, 'calories', None),
                device_name=getattr(run_activity, 'device_name', None),
                elevation_gain=current_elevation_gain,
                elev_high=getattr(run_activity, 'elev_high', None),
                elev_low=getattr(run_activity, 'elev_low', None),
            )
            session.add(activity)
            created = True
        else:
            activity.name = run_activity.name
            activity.distance = float(run_activity.distance)
            activity.moving_time = run_activity.moving_time
            activity.elapsed_time = run_activity.elapsed_time
            activity.type = run_activity.type
            activity.subtype = run_activity.subtype
            activity.summary_polyline = (
                run_activity.map and run_activity.map.summary_polyline or ""
            )
            activity.average_heartrate = run_activity.average_heartrate
            activity.max_heartrate = getattr(run_activity, 'max_heartrate', None)
            activity.average_speed = float(run_activity.average_speed)
            activity.max_speed = getattr(run_activity, 'max_speed', None) if hasattr(run_activity, 'max_speed') and run_activity.max_speed else None
            activity.average_cadence = getattr(run_activity, 'average_cadence', None)
            activity.calories = getattr(run_activity, 'calories', None)
            activity.device_name = getattr(run_activity, 'device_name', None)
            activity.elevation_gain = current_elevation_gain
            activity.elev_high = getattr(run_activity, 'elev_high', None)
            activity.elev_low = getattr(run_activity, 'elev_low', None)
    except Exception as e:
        print(f"something wrong with {run_activity.id}")
        print(str(e))

    return created


def update_or_create_lap(session, activity_id, lap_data, lap_index):
    """创建或更新活动圈数据"""

    try:
        lap = session.query(ActivityLap).filter_by(
            activity_id=int(activity_id),
            lap_index=lap_index
        ).first()

        if not lap:
            lap = ActivityLap(
                activity_id=int(activity_id),
                lap_index=lap_index,
                distance=float(lap_data.distance) if hasattr(lap_data, 'distance') and lap_data.distance else 0.0,
                elapsed_time=int(lap_data.elapsed_time) if hasattr(lap_data, 'elapsed_time') and lap_data.elapsed_time else 0,
                moving_time=int(lap_data.moving_time) if hasattr(lap_data, 'moving_time') and lap_data.moving_time else 0,
                average_speed=float(lap_data.average_speed) if hasattr(lap_data, 'average_speed') and lap_data.average_speed else None,
                average_heartrate=float(lap_data.average_heartrate) if hasattr(lap_data, 'average_heartrate') and lap_data.average_heartrate else None,
                total_elevation_gain=float(lap_data.total_elevation_gain) if hasattr(lap_data, 'total_elevation_gain') and lap_data.total_elevation_gain else None,
                start_date=str(lap_data.start_date) if hasattr(lap_data, 'start_date') and lap_data.start_date else None,
            )
            session.add(lap)
        else:
            lap.distance = float(lap_data.distance) if hasattr(lap_data, 'distance') and lap_data.distance else 0.0
            lap.elapsed_time = int(lap_data.elapsed_time) if hasattr(lap_data, 'elapsed_time') and lap_data.elapsed_time else 0
            lap.moving_time = int(lap_data.moving_time) if hasattr(lap_data, 'moving_time') and lap_data.moving_time else 0
            lap.average_speed = float(lap_data.average_speed) if hasattr(lap_data, 'average_speed') and lap_data.average_speed else None
            lap.average_heartrate = float(lap_data.average_heartrate) if hasattr(lap_data, 'average_heartrate') and lap_data.average_heartrate else None
            lap.total_elevation_gain = float(lap_data.total_elevation_gain) if hasattr(lap_data, 'total_elevation_gain') and lap_data.total_elevation_gain else None
            lap.start_date = str(lap_data.start_date) if hasattr(lap_data, 'start_date') and lap_data.start_date else None

    except Exception as e:
        print(f"something wrong with lap {activity_id}-{lap_index}: {str(e)}")

    return True


def update_or_create_stream(session, activity_id, stream_type, stream_data):
    """创建或更新活动数据流"""
    import json

    try:
        stream = session.query(ActivityStream).filter_by(
            activity_id=int(activity_id),
            stream_type=stream_type
        ).first()

        # 将数据序列化为 JSON
        data_json = json.dumps(stream_data) if stream_data else "[]"

        if not stream:
            stream = ActivityStream(
                activity_id=int(activity_id),
                stream_type=stream_type,
                data=data_json,
            )
            session.add(stream)
        else:
            stream.data = data_json

    except Exception as e:
        print(f"something wrong with stream {activity_id}-{stream_type}: {str(e)}")

    return True


def add_missing_columns(engine, model):
    inspector = inspect(engine)
    table_name = model.__tablename__
    columns = {col["name"] for col in inspector.get_columns(table_name)}
    missing_columns = []

    for column in model.__table__.columns:
        if column.name not in columns:
            missing_columns.append(column)
    if missing_columns:
        with engine.connect() as conn:
            for column in missing_columns:
                column_type = str(column.type)
                conn.execute(
                    text(
                        f"ALTER TABLE {table_name} ADD COLUMN {column.name} {column_type}"
                    )
                )


def init_db(db_path):
    engine = create_engine(
        f"sqlite:///{db_path}", connect_args={"check_same_thread": False}
    )
    Base.metadata.create_all(engine)  # 会创建所有表

    # check missing columns for Activity
    add_missing_columns(engine, Activity)
    # check missing columns for ActivityLap
    add_missing_columns(engine, ActivityLap)
    # check missing columns for ActivityStream
    add_missing_columns(engine, ActivityStream)

    sm = sessionmaker(bind=engine)
    session = sm()
    session.commit()
    return session
