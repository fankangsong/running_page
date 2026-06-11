# 跑步数据丰富化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 扩展跑步活动数据，支持心率/配速曲线展示和每公里分解表格

**Architecture:** 
- 后端：扩展 SQLAlchemy 数据模型，新增 laps/streams 表，修改 Strava 同步逻辑调用 Laps API 和 Streams API
- 前端：扩展 TypeScript 接口，新增 ActivityCurves 曲线组件和 KmSplitsTable 表格组件

**Tech Stack:** Python (SQLAlchemy, stravalib), TypeScript, React, Tailwind CSS, SVG

---

## 文件结构

**后端文件：**
- `run_page/generator/db.py` - 数据模型定义
- `run_page/generator/__init__.py` - 同步逻辑

**前端文件：**
- `src/utils/utils.ts` - TypeScript 接口和工具函数
- `src/components/RunDetailPanel/index.tsx` - 扩展详情面板
- `src/components/ActivityCurves/index.tsx` - 新建曲线图组件
- `src/components/KmSplitsTable/index.tsx` - 新建每公里表格组件

---

## Phase 1: 后端数据层

### Task 1: 扩展 Activity 模型新增字段

**Files:**
- Modify: `run_page/generator/db.py:33-67`

- [ ] **Step 1: 在 Activity 类中添加新字段定义**

在 `Activity` 类（约第50行）中添加以下字段：

```python
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
```

- [ ] **Step 2: 更新 ACTIVITY_KEYS 列表**

修改 `ACTIVITY_KEYS` 列表（约第33行）：

```python
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
```

- [ ] **Step 3: 修改 to_dict 方法处理新字段**

修改 `to_dict` 方法（约第69行）：

```python
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
```

- [ ] **Step 4: Commit**

```bash
git add run_page/generator/db.py
git commit -m "feat(db): extend Activity model with new fields"
```

---

### Task 2: 创建 ActivityLap 和 ActivityStream 模型

**Files:**
- Modify: `run_page/generator/db.py` (追加新类)

- [ ] **Step 1: 添加 ActivityLap 模型类**

在 `Activity` 类之后添加：

```python
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
```

- [ ] **Step 2: 添加 ActivityStream 模型类**

在 `ActivityLap` 类之后添加：

```python
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
```

- [ ] **Step 3: 更新 init_db 函数创建新表**

修改 `init_db` 函数（约第188行），确保创建新表：

```python
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
```

- [ ] **Step 4: Commit**

```bash
git add run_page/generator/db.py
git commit -m "feat(db): add ActivityLap and ActivityStream models"
```

---

### Task 3: 实现 update_or_create_lap 和 update_or_create_stream 函数

**Files:**
- Modify: `run_page/generator/db.py` (在 update_or_create_activity 之后)

- [ ] **Step 1: 添加 update_or_create_lap 函数**

在 `update_or_create_activity` 函数之后添加：

```python
def update_or_create_lap(session, activity_id, lap_data, lap_index):
    """创建或更新活动圈数据"""
    import json
    
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
                start_date=str(lap_data.start_date) if hasattr(lap_data, 'start_date') else None,
            )
            session.add(lap)
        else:
            lap.distance = float(lap_data.distance) if hasattr(lap_data, 'distance') and lap_data.distance else 0.0
            lap.elapsed_time = int(lap_data.elapsed_time) if hasattr(lap_data, 'elapsed_time') else 0
            lap.moving_time = int(lap_data.moving_time) if hasattr(lap_data, 'moving_time') else 0
            lap.average_speed = float(lap_data.average_speed) if hasattr(lap_data, 'average_speed') and lap_data.average_speed else None
            lap.average_heartrate = float(lap_data.average_heartrate) if hasattr(lap_data, 'average_heartrate') and lap_data.average_heartrate else None
            lap.total_elevation_gain = float(lap_data.total_elevation_gain) if hasattr(lap_data, 'total_elevation_gain') else None
            lap.start_date = str(lap_data.start_date) if hasattr(lap_data, 'start_date') else None
            
    except Exception as e:
        print(f"something wrong with lap {activity_id}-{lap_index}: {str(e)}")
        
    return True
```

- [ ] **Step 2: 添加 update_or_create_stream 函数**

```python
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
```

- [ ] **Step 3: Commit**

```bash
git add run_page/generator/db.py
git commit -m "feat(db): add update_or_create_lap and update_or_create_stream functions"
```

---

### Task 4: 修改 Generator 类添加同步方法

**Files:**
- Modify: `run_page/generator/__init__.py`

- [ ] **Step 1: 导入新模型类**

在文件顶部导入部分添加：

```python
from .db import Activity, ActivityLap, ActivityStream, init_db, update_or_create_activity, update_or_create_lap, update_or_create_stream
```

- [ ] **Step 2: 添加 sync_activity_laps 方法**

在 `Generator` 类中添加方法：

```python
def sync_activity_laps(self, activity_id):
    """同步单个活动的圈数数据"""
    try:
        laps = self.client.get_activity_laps(activity_id)
        for idx, lap in enumerate(laps, start=1):
            update_or_create_lap(self.session, activity_id, lap, idx)
        print(f"Synced {len(list(laps))} laps for activity {activity_id}")
    except Exception as e:
        print(f"Failed to sync laps for {activity_id}: {str(e)}")
```

- [ ] **Step 3: 添加 sync_activity_streams 方法**

```python
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
```

- [ ] **Step 4: 修改 sync 方法调用新增方法**

修改 `sync` 方法，在 `update_or_create_activity` 之后调用：

```python
def sync(self, force):
    """
    Sync activities means sync from strava
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
        activity.elevation_gain = activity.total_elevation_gain
        activity.subtype = activity.type
        
        # 更新基础活动数据
        created = update_or_create_activity(self.session, activity)
        
        # 同步 laps 和 streams
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
```

- [ ] **Step 5: Commit**

```bash
git add run_page/generator/__init__.py
git commit -m "feat(generator): add sync methods for laps and streams"
```

---

### Task 5: 修改 load 方法导出 laps 和 streams

**Files:**
- Modify: `run_page/generator/__init__.py` (load 方法)

- [ ] **Step 1: 修改 load 方法关联查询 laps 和 streams**

```python
def load(self):
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
            activity.start_date_local, "%Y-%m-%d %H:%M:%S"
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
        activity.streak = streak
        last_date = date
        
        if not IGNORE_BEFORE_SAVING:
            activity.summary_polyline = filter_out(activity.summary_polyline)
        
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
```

- [ ] **Step 2: Commit**

```bash
git add run_page/generator/__init__.py
git commit -m "feat(generator): export laps and streams in load method"
```

---

## Phase 2: 前端数据层

### Task 6: 扩展 TypeScript 接口定义

**Files:**
- Modify: `src/utils/utils.ts:37-50`

- [ ] **Step 1: 扩展 Activity 接口**

修改 `Activity` 接口（约第37行）：

```typescript
export interface Activity {
  run_id: number;
  name: string;
  distance: number;
  moving_time: string;
  elapsed_time?: string;
  type: string;
  subtype?: string;
  start_date: string;
  start_date_local: string;
  location_country?: string | null;
  summary_polyline?: string | null;
  average_heartrate?: number | null;
  max_heartrate?: number | null;
  average_speed: number;
  max_speed?: number | null;
  average_cadence?: number | null;
  calories?: number | null;
  device_name?: string | null;
  elevation_gain?: number | null;
  elev_high?: number | null;
  elev_low?: number | null;
  streak: number;
  laps?: Lap[];
  streams?: ActivityStreams;
}
```

- [ ] **Step 2: 添加 Lap 接口**

在 `Activity` 接口之后添加：

```typescript
export interface Lap {
  lap_index: number;
  distance: number;
  elapsed_time: number;
  moving_time: number;
  average_speed?: number;
  average_heartrate?: number;
  total_elevation_gain?: number;
  start_date?: string;
}
```

- [ ] **Step 3: 添加 ActivityStreams 接口**

```typescript
export interface ActivityStreams {
  heartrate?: number[];
  velocity_smooth?: number[];
  altitude?: number[];
  distance?: number[];
  time?: number[];
}
```

- [ ] **Step 4: Commit**

```bash
git add src/utils/utils.ts
git commit -m "feat(utils): extend Activity interface with new fields, Lap, and ActivityStreams"
```

---

### Task 7: 添加格式化工具函数

**Files:**
- Modify: `src/utils/utils.ts` (在 export 部分之前)

- [ ] **Step 1: 添加 formatCadence 函数**

```typescript
export const formatCadence = (cadence: number | null | undefined): string => {
  if (!cadence || !Number.isFinite(cadence)) return '--';
  return `${Math.round(cadence)} spm`;
};
```

- [ ] **Step 2: 添加 formatCalories 函数**

```typescript
export const formatCalories = (calories: number | null | undefined): string => {
  if (!calories || !Number.isFinite(calories)) return '--';
  return `${Math.round(calories)} kcal`;
};
```

- [ ] **Step 3: 添加 formatElevation 函数**

```typescript
export const formatElevation = (meters: number | null | undefined): string => {
  if (!meters || !Number.isFinite(meters)) return '--';
  return `${Math.round(meters)} m`;
};
```

- [ ] **Step 4: 添加 formatLapTime 函数**

```typescript
export const formatLapTime = (seconds: number): string => {
  if (!seconds || !Number.isFinite(seconds)) return '--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};
```

- [ ] **Step 5: 添加 computeKmSplitsFromStreams 函数**

```typescript
export const computeKmSplitsFromStreams = (
  streams: ActivityStreams | undefined,
  totalDistance: number
): Lap[] => {
  if (!streams?.distance || !streams?.velocity_smooth) return [];
  if (streams.distance.length === 0) return [];

  const kmCount = Math.ceil(totalDistance / 1000);
  const splits: Lap[] = [];

  for (let km = 1; km <= kmCount; km++) {
    const targetDist = km * 1000;
    const prevTargetDist = (km - 1) * 1000;

    // 找到当前公里结束点索引
    const endIdx = streams.distance.findIndex(d => d >= targetDist);
    if (endIdx < 0) continue;

    // 找到当前公里开始点索引
    const startIdx = km === 1 ? 0 : streams.distance.findIndex(d => d >= prevTargetDist);
    if (startIdx < 0) continue;

    // 计算该公里段数据
    const segmentSpeed = streams.velocity_smooth.slice(startIdx, endIdx + 1);
    const avgSpeed = segmentSpeed.length > 0
      ? segmentSpeed.reduce((a, b) => a + b, 0) / segmentSpeed.length
      : 0;

    // 计算时间
    const elapsed_time = streams.time
      ? (streams.time[endIdx] - streams.time[startIdx])
      : 0;

    // 计算平均心率
    let avgHr: number | undefined = undefined;
    if (streams.heartrate && streams.heartrate.length > 0) {
      const segmentHr = streams.heartrate.slice(startIdx, endIdx + 1);
      if (segmentHr.length > 0) {
        avgHr = segmentHr.reduce((a, b) => a + b, 0) / segmentHr.length;
      }
    }

    // 计算海拔变化
    let elevGain: number | undefined = undefined;
    if (streams.altitude && streams.altitude.length > 0) {
      const startElev = streams.altitude[startIdx];
      const endElev = streams.altitude[endIdx];
      if (Number.isFinite(startElev) && Number.isFinite(endElev)) {
        elevGain = endElev - startElev;
      }
    }

    splits.push({
      lap_index: km,
      distance: targetDist - prevTargetDist,
      elapsed_time: elapsed_time,
      moving_time: elapsed_time,
      average_speed: avgSpeed,
      average_heartrate: avgHr,
      total_elevation_gain: elevGain,
    });
  }

  return splits;
};
```

- [ ] **Step 6: 更新 export 语句导出新函数**

在文件底部的 export 部分添加：

```typescript
export {
  // ... 现有导出
  formatCadence,
  formatCalories,
  formatElevation,
  formatLapTime,
  computeKmSplitsFromStreams,
};
```

- [ ] **Step 7: Commit**

```bash
git add src/utils/utils.ts
git commit -m "feat(utils): add formatting functions for cadence, calories, elevation and km splits"
```

---

## Phase 3: UI 组件开发

### Task 8: 扩展 RunDetailPanel 组件

**Files:**
- Modify: `src/components/RunDetailPanel/index.tsx`

- [ ] **Step 1: 导入新函数和类型**

在文件顶部导入部分添加：

```typescript
import {
  Activity,
  formatPace,
  formatRunTime,
  isRun,
  formatCadence,
  formatCalories,
  formatElevation,
  Lap,
  ActivityStreams,
} from '@/utils/utils';
```

- [ ] **Step 2: 解构新增属性**

在组件内部，解构新增属性：

```typescript
const RunDetailPanel = ({
  run,
  monthlyDistanceKm,
  monthRunDates = [],
}: {
  run: Activity;
  monthlyDistanceKm: number;
  monthRunDates?: string[];
}) => {
  // 现有解构...
  const distanceKm = (run.distance / 1000).toFixed(2);
  const runTime = formatRunTime(run.moving_time);
  const pace = run.average_speed ? formatPace(run.average_speed) : `0'00"`;
  const currentHeartRate = Number.isFinite(run.average_heartrate)
    ? Math.round(run.average_heartrate as number)
    : null;
  
  // 新增解构
  const maxHr = Number.isFinite(run.max_heartrate)
    ? Math.round(run.max_heartrate as number)
    : null;
  const cadence = run.average_cadence;
  const calories = run.calories;
  const elevHigh = run.elev_high;
  const elevLow = run.elev_low;
  const elevGain = run.elevation_gain ?? (elevHigh && elevLow ? elevHigh - elevLow : null);
  const laps = run.laps;
  const streams = run.streams;
```

- [ ] **Step 3: 在现有指标网格后添加扩展指标行**

在现有指标网格（约第68-168行）后添加：

```tsx
{/* 新增：扩展指标行 */}
<div className="grid grid-cols-2 gap-y-8 gap-x-4 border-t border-gray-800/50 py-6">
  <div className="flex flex-col items-start text-left gap-1">
    <span className="font-sans text-[10px] md:text-xs font-bold text-secondary uppercase tracking-wider truncate flex items-center gap-1">
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
      Max HR
    </span>
    <div className="flex items-baseline justify-start gap-1 mt-1 whitespace-nowrap">
      <div className="text-3xl md:text-4xl font-condensed font-black text-red-400 tracking-tighter leading-none">
        {maxHr !== null ? maxHr : '--'}
      </div>
      {maxHr !== null && (
        <span className="text-xs font-bold text-secondary uppercase tracking-widest">BPM</span>
      )}
    </div>
  </div>

  <div className="flex flex-col items-start text-left gap-1">
    <span className="font-sans text-[10px] md:text-xs font-bold text-secondary uppercase tracking-wider truncate flex items-center gap-1">
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
      Cadence
    </span>
    <div className="flex items-baseline justify-start gap-1 mt-1 whitespace-nowrap">
      <div className="text-3xl md:text-4xl font-condensed font-black text-yellow-400 tracking-tighter leading-none">
        {formatCadence(cadence)}
      </div>
    </div>
  </div>

  <div className="flex flex-col items-start text-left gap-1">
    <span className="font-sans text-[10px] md:text-xs font-bold text-secondary uppercase tracking-wider truncate flex items-center gap-1">
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      </svg>
      Calories
    </span>
    <div className="flex items-baseline justify-start gap-1 mt-1 whitespace-nowrap">
      <div className="text-3xl md:text-4xl font-condensed font-black text-pink-400 tracking-tighter leading-none">
        {formatCalories(calories)}
      </div>
    </div>
  </div>

  <div className="flex flex-col items-start text-left gap-1">
    <span className="font-sans text-[10px] md:text-xs font-bold text-secondary uppercase tracking-wider truncate flex items-center gap-1">
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
      Elevation
    </span>
    <div className="flex items-baseline justify-start gap-1 mt-1 whitespace-nowrap">
      <div className="text-3xl md:text-4xl font-condensed font-black text-teal-400 tracking-tighter leading-none">
        {formatElevation(elevGain)}
      </div>
      {elevHigh && elevLow && (
        <div className="text-[10px] text-gray-500 font-medium ml-1">
          ({formatElevation(elevLow)} - {formatElevation(elevHigh)})
        </div>
      )}
    </div>
  </div>
</div>
```

- [ ] **Step 4: Commit**

```bash
git add src/components/RunDetailPanel/index.tsx
git commit -m "feat(RunDetailPanel): add extended metrics row (max HR, cadence, calories, elevation)"
```

---

### Task 9: 创建 ActivityCurves 曲线组件

**Files:**
- Create: `src/components/ActivityCurves/index.tsx`

- [ ] **Step 1: 创建组件文件和基础结构**

```tsx
import { useMemo, useState } from 'react';
import { ActivityStreams, formatPace } from '@/utils/utils';

type CurveType = 'heartrate' | 'pace' | 'altitude';

interface ActivityCurvesProps {
  streams?: ActivityStreams;
  totalDistance: number;
  className?: string;
}

const ActivityCurves = ({ streams, totalDistance, className }: ActivityCurvesProps) => {
  const [curveType, setCurveType] = useState<CurveType>('heartrate');

  // 检查数据可用性
  const hasHeartrate = streams?.heartrate && streams.heartrate.length > 0;
  const hasVelocity = streams?.velocity_smooth && streams.velocity_smooth.length > 0;
  const hasAltitude = streams?.altitude && streams.altitude.length > 0;

  const availableTypes: CurveType[] = useMemo(() => {
    const types: CurveType[] = [];
    if (hasHeartrate) types.push('heartrate');
    if (hasVelocity) types.push('pace');
    if (hasAltitude) types.push('altitude');
    return types;
  }, [hasHeartrate, hasVelocity, hasAltitude]);

  if (availableTypes.length === 0) {
    return (
      <div className={`${className || ''} text-center py-4`}>
        <span className="text-secondary text-sm">暂无曲线数据</span>
      </div>
    );
  }

  return (
    <div className={`${className || ''}`}>
      {/* 类型切换按钮 */}
      <div className="flex justify-center gap-2 mb-3">
        {availableTypes.map((type) => (
          <button
            key={type}
            onClick={() => setCurveType(type)}
            className={`px-3 py-1 text-xs font-bold rounded-full transition-all ${
              curveType === type
                ? type === 'heartrate'
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50'
                  : type === 'pace'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                : 'bg-gray-800/50 text-secondary hover:bg-gray-700/50'
            }`}
          >
            {type === 'heartrate' ? '心率' : type === 'pace' ? '配速' : '海拔'}
          </button>
        ))}
      </div>

      {/* SVG 曲线图 */}
      <div className="relative h-[120px] bg-gray-900/30 rounded-lg overflow-hidden">
        <CurveSVG
          streams={streams}
          curveType={curveType}
          totalDistance={totalDistance}
        />
      </div>
    </div>
  );
};

// 内部 SVG 组件
const CurveSVG = ({
  streams,
  curveType,
  totalDistance,
}: {
  streams?: ActivityStreams;
  curveType: CurveType;
  totalDistance: number;
}) => {
  const svgWidth = 300;
  const svgHeight = 120;
  const padding = { top: 10, bottom: 25, left: 5, right: 5 };

  const chartData = useMemo(() => {
    if (!streams) return null;

    let data: number[] = [];
    let yLabel = '';
    let color = '';

    switch (curveType) {
      case 'heartrate':
        data = streams.heartrate || [];
        yLabel = 'BPM';
        color = '#fb923c'; // orange-400
        break;
      case 'pace':
        data = (streams.velocity_smooth || []).map((v) =>
          v > 0 ? (1000 / v) / 60 : 0
        );
        yLabel = '/KM';
        color = '#60a5fa'; // blue-400
        break;
      case 'altitude':
        data = streams.altitude || [];
        yLabel = 'm';
        color = '#34d399'; // emerald-400
        break;
    }

    if (data.length === 0) return null;

    // 采样数据以避免渲染过多点
    const maxPoints = 100;
    const sampledData = data.length > maxPoints
      ? data.filter((_, i) => i % Math.ceil(data.length / maxPoints) === 0)
      : data;

    const minVal = Math.min(...sampledData.filter(v => Number.isFinite(v)));
    const maxVal = Math.max(...sampledData.filter(v => Number.isFinite(v)));
    const range = maxVal - minVal || 1;

    return {
      data: sampledData,
      minVal,
      maxVal,
      range,
      yLabel,
      color,
    };
  }, [streams, curveType]);

  if (!chartData) return null;

  const { data, minVal, maxVal, range, yLabel, color } = chartData;
  const chartWidth = svgWidth - padding.left - padding.right;
  const chartHeight = svgHeight - padding.top - padding.bottom;

  // 生成 SVG path 点
  const points = data.map((val, idx) => {
    const x = padding.left + (idx / (data.length - 1 || 1)) * chartWidth;
    const y = padding.top + chartHeight - ((val - minVal) / range) * chartHeight;
    return `${x},${Number.isFinite(y) ? y : chartHeight}`;
  });

  const pathD = `M ${points.join(' L ')}`;

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${svgWidth} ${svgHeight}`} preserveAspectRatio="xMidYMid meet">
      {/* 背景网格线 */}
      <line x1={padding.left} y1={padding.top} x2={padding.left} y2={svgHeight - padding.bottom} stroke="#374151" strokeWidth="0.5" />
      <line x1={padding.left} y1={svgHeight - padding.bottom} x2={svgWidth - padding.right} y2={svgHeight - padding.bottom} stroke="#374151" strokeWidth="0.5" />

      {/* Y轴标签 */}
      <text x={svgWidth - padding.right - 2} y={padding.top + 5} fill="#8E8E93" fontSize="8" textAnchor="end">
        {maxVal.toFixed(0)}{yLabel}
      </text>
      <text x={svgWidth - padding.right - 2} y={svgHeight - padding.bottom - 3} fill="#8E8E93" fontSize="8" textAnchor="end">
        {minVal.toFixed(0)}{yLabel}
      </text>

      {/* X轴标签（距离） */}
      <text x={padding.left} y={svgHeight - 5} fill="#8E8E93" fontSize="8">
        0km
      </text>
      <text x={svgWidth - padding.right} y={svgHeight - 5} fill="#8E8E93" fontSize="8" textAnchor="end">
        {(totalDistance / 1000).toFixed(1)}km
      </text>

      {/* 曲线 */}
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
    </svg>
  );
};

export default ActivityCurves;
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ActivityCurves/index.tsx
git commit -m "feat(ActivityCurves): create SVG curve component for heartrate/pace/altitude"
```

---

### Task 10: 创建 KmSplitsTable 每公里表格组件

**Files:**
- Create: `src/components/KmSplitsTable/index.tsx`

- [ ] **Step 1: 创建组件文件**

```tsx
import { useMemo } from 'react';
import { Lap, ActivityStreams, formatPace, formatLapTime, computeKmSplitsFromStreams } from '@/utils/utils';

interface KmSplitsTableProps {
  laps?: Lap[];
  streams?: ActivityStreams;
  totalDistance: number;
}

const KmSplitsTable = ({ laps, streams, totalDistance }: KmSplitsTableProps) => {
  // 优先使用 laps 数据，若无则从 streams 计算
  const splits = useMemo(() => {
    if (laps && laps.length > 0) {
      return laps;
    }
    if (streams) {
      return computeKmSplitsFromStreams(streams, totalDistance);
    }
    return [];
  }, [laps, streams, totalDistance]);

  if (splits.length === 0) {
    return (
      <div className="text-center py-4">
        <span className="text-secondary text-sm">暂无每公里数据</span>
      </div>
    );
  }

  // 计算累计时间
  const cumulativeTime = useMemo(() => {
    const times: number[] = [];
    let sum = 0;
    splits.forEach((split) => {
      sum += split.elapsed_time || 0;
      times.push(sum);
    });
    return times;
  }, [splits]);

  // 找出最快公里
  const fastestIdx = useMemo(() => {
    let fastest = Infinity;
    let idx = -1;
    splits.forEach((split, i) => {
      if (split.average_speed && split.average_speed > 0) {
        const pace = (1000 / split.average_speed) / 60;
        if (pace < fastest) {
          fastest = pace;
          idx = i;
        }
      }
    });
    return idx;
  }, [splits]);

  return (
    <div className="overflow-hidden rounded-lg border border-gray-800/50">
      {/* 表头 */}
      <div className="grid grid-cols-5 bg-gray-900/50 px-3 py-2">
        <div className="text-[10px] font-bold text-secondary uppercase tracking-wider">KM</div>
        <div className="text-[10px] font-bold text-secondary uppercase tracking-wider">配速</div>
        <div className="text-[10px] font-bold text-secondary uppercase tracking-wider">累计</div>
        <div className="text-[10px] font-bold text-secondary uppercase tracking-wider">心率</div>
        <div className="text-[10px] font-bold text-secondary uppercase tracking-wider">海拔</div>
      </div>

      {/* 数据行 */}
      {splits.map((split, idx) => {
        const isFastest = idx === fastestIdx;
        const pace = split.average_speed ? formatPace(split.average_speed) : '--';
        const cumulative = formatLapTime(cumulativeTime[idx]);
        const hr = split.average_heartrate ? Math.round(split.average_heartrate) : '--';
        const elev = split.total_elevation_gain
          ? `${split.total_elevation_gain > 0 ? '+' : ''}${Math.round(split.total_elevation_gain)}m`
          : '--';

        return (
          <div
            key={idx}
            className={`grid grid-cols-5 px-3 py-2 transition-colors ${
              isFastest
                ? 'bg-accent/20 ring-1 ring-accent/50'
                : 'hover:bg-gray-800/30'
            }`}
          >
            <div className="font-condensed font-black text-primary">
              {split.lap_index}
              {isFastest && <span className="text-accent ml-1">*</span>}
            </div>
            <div className={`font-condensed font-black ${isFastest ? 'text-accent' : 'text-primary'}`}>
              {pace}
            </div>
            <div className="font-condensed font-medium text-secondary">
              {cumulative}
            </div>
            <div className="font-condensed font-medium text-secondary">
              {hr !== '--' ? `${hr} bpm` : '--'}
            </div>
            <div className="font-condensed font-medium text-secondary">
              {elev}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default KmSplitsTable;
```

- [ ] **Step 2: Commit**

```bash
git add src/components/KmSplitsTable/index.tsx
git commit -m "feat(KmSplitsTable): create per-kilometer splits table component"
```

---

### Task 11: 在 RunDetailPanel 中集成新组件

**Files:**
- Modify: `src/components/RunDetailPanel/index.tsx`

- [ ] **Step 1: 导入新组件**

在文件顶部添加导入：

```tsx
import ActivityCurves from '@/components/ActivityCurves';
import KmSplitsTable from '@/components/KmSplitsTable';
```

- [ ] **Step 2: 在心率区间条后添加曲线图和表格**

在心率区间条组件（约第170-203行）后添加：

```tsx
{/* 曲线图 */}
{(run.streams?.heartrate || run.streams?.velocity_smooth || run.streams?.altitude) && (
  <div className="flex flex-col mt-5 pt-4 border-t border-gray-800/50 gap-3">
    <span className="font-sans text-[9px] md:text-[10px] font-bold text-secondary uppercase tracking-wider mb-1.5 text-center">
      活动曲线
    </span>
    <ActivityCurves
      streams={run.streams}
      totalDistance={run.distance}
    />
  </div>
)}

{/* 每公里表格 */}
{(run.laps && run.laps.length > 0 || run.streams) && (
  <div className="flex flex-col mt-5 pt-4 border-t border-gray-800/50 gap-3">
    <span className="font-sans text-[9px] md:text-[10px] font-bold text-secondary uppercase tracking-wider mb-1.5 text-center">
      每公里分解
    </span>
    <KmSplitsTable
      laps={run.laps}
      streams={run.streams}
      totalDistance={run.distance}
    />
  </div>
)}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/RunDetailPanel/index.tsx
git commit -m "feat(RunDetailPanel): integrate ActivityCurves and KmSplitsTable components"
```

---

## Phase 4: 测试与优化

### Task 12: 验证数据同步流程

**Files:**
- N/A (手动测试)

- [ ] **Step 1: 运行 Strava 同步测试**

```bash
cd /Users/fankangsong/code/running_page
python run_page/strava_sync.py ${STRAVA_CLIENT_ID} ${STRAVA_CLIENT_SECRET} ${STRAVA_REFRESH_TOKEN}
```

Expected: 同步完成，数据库包含 laps 和 streams 数据

- [ ] **Step 2: 检查数据库内容**

```bash
sqlite3 run_page/data.db "SELECT COUNT(*) FROM activity_laps;"
sqlite3 run_page/data.db "SELECT COUNT(*) FROM activity_streams;"
sqlite3 run_page/data.db "SELECT stream_type, LENGTH(data) FROM activity_streams LIMIT 5;"
```

Expected: 表中存在数据

- [ ] **Step 3: 检查 JSON 导出**

```bash
head -200 src/static/activities.json | grep -E "laps|streams|heartrate"
```

Expected: JSON 中包含 laps 和 streams 字段

---

### Task 13: 验证前端显示

**Files:**
- N/A (手动测试)

- [ ] **Step 1: 启动开发服务器**

```bash
pnpm develop
```

- [ ] **Step 2: 检查类型编译**

Expected: 无 TypeScript 编译错误

- [ ] **Step 3: 测试详情页面**

打开浏览器访问跑步详情页，验证：
- 扩展指标行显示正确
- 曲线图渲染正常
- 每公里表格显示正确
- 最快公里高亮显示

---

### Task 14: 最终提交和文档更新

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: 更新 CLAUDE.md 添加新数据字段说明**

在数据流部分添加：

```markdown
### 数据模型扩展

Activity 现包含扩展字段：
- max_heartrate, max_speed, average_cadence, calories, device_name
- elev_high, elev_low
- laps[] - 每公里分解数据
- streams{} - 时序曲线数据 (heartrate, velocity_smooth, altitude, distance, time)
```

- [ ] **Step 2: 最终 commit**

```bash
git add -A
git commit -m "feat: complete activity data enrichment - curves and km splits"
```

---

## 自检清单

**Spec Coverage:**
- ✅ Task 1-2: 数据库架构扩展（activities 新字段、activity_laps 表、activity_streams 表）
- ✅ Task 3-5: Python 同步逻辑（update_or_create_lap/stream、sync 方法、load 方法）
- ✅ Task 6-7: 前端数据层（Activity/Lap/ActivityStreams 接口、格式化函数）
- ✅ Task 8-11: UI 组件（RunDetailPanel 扩展、ActivityCurves、KmSplitsTable）
- ✅ Task 12-14: 测试与文档

**Placeholder Scan:**
- ✅ 无 TBD/TODO
- ✅ 所有代码步骤有完整实现
- ✅ 所有测试步骤有具体命令

**Type Consistency:**
- ✅ Lap 接口定义在 Task 6，使用于 Task 7, 10, 11
- ✅ ActivityStreams 接口定义在 Task 6，使用于 Task 7, 9, 10, 11
- ✅ formatCadence/formatCalories/formatElevation 定义在 Task 7，使用于 Task 8
- ✅ computeKmSplitsFromStreams 定义在 Task 7，使用于 Task 10