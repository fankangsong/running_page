# run_page/data.db 数据库设计文档

## 概述

- **数据库路径**：`run_page/data.db`
- **数据库引擎**：SQLite
- **ORM 框架**：SQLAlchemy
- **ORM 定义文件**：`run_page/generator/db.py`
- **初始化入口**：`init_db(db_path)` 函数

---

## ER 图（实体关系）

```
┌──────────────────────────────┐
│         activities           │
│──────────────────────────────│
│ run_id (PK) ◄────────────────┼────────────────────┐
│ name                         │                    │
│ distance                     │                    │
│ moving_time                  │                    │
│ elapsed_time                 │                    │
│ type                         │     ┌──────────────┼──────────────────┐
│ subtype                      │     │              │                  │
│ start_date                   │     │              │                  │
│ start_date_local             │     │              │                  │
│ location_country             │     │              │                  │
│ summary_polyline             │     │              │                  │
│ average_heartrate            │     │              │                  │
│ max_heartrate                │     │              │                  │
│ average_speed                │     │              │                  │
│ max_speed                    │     │              │                  │
│ average_cadence              │     │              │                  │
│ calories                     │     │              │                  │
│ device_name                  │     │              │                  │
│ elevation_gain               │     │              │                  │
│ elev_high                    │     │              │                  │
│ elev_low                     │     │              │                  │
└──────────────────────────────┘     │              │
                                     ▼              │
┌──────────────────────────────┐     │              │
│       activity_laps          │     │              │
│──────────────────────────────│     │              │
│ id (PK, 自增)                 │     │              │
│ activity_id (INDEX) ─────────┼─────┘              │
│ lap_index                    │                    │
│ distance                     │                    │
│ elapsed_time                 │                    │
│ moving_time                  │                    │
│ average_speed                │                    │
│ average_heartrate            │                    │
│ total_elevation_gain         │                    │
│ start_date                   │                    │
└──────────────────────────────┘                    │
                                                    │
┌──────────────────────────────┐                    │
│      activity_streams        │                    │
│──────────────────────────────│                    │
│ id (PK, 自增)                 │                    │
│ activity_id (INDEX) ─────────┼────────────────────┘
│ stream_type                  │
│ data (JSON)                  │
└──────────────────────────────┘
```

**关系说明**：
- `activity_laps.activity_id` → `activities.run_id`（一对多：一个活动包含多个圈/分段）
- `activity_streams.activity_id` → `activities.run_id`（一对多：一个活动包含多条数据流）

---

## 表结构详情

### 表 1：`activities` — 活动主表

存储每一次运动活动的核心数据，来源包括 Strava、Garmin、Nike、GPX 文件等。

| 序号 | 字段名 | 类型 | 约束 | 说明 |
|:---:|--------|------|------|------|
| 1 | `run_id` | INTEGER | **PRIMARY KEY** | 活动唯一ID，来源于 Strava |
| 2 | `name` | TEXT | - | 活动名称 |
| 3 | `distance` | FLOAT | - | 总距离（米） |
| 4 | `moving_time` | INTERVAL | - | 移动时间（timedelta） |
| 5 | `elapsed_time` | INTERVAL | - | 总耗时（timedelta），包含暂停时间 |
| 6 | `type` | TEXT | - | 活动类型：Run / Hike / Ride / Walk 等 |
| 7 | `subtype` | TEXT | - | 活动子类型 |
| 8 | `start_date` | TEXT | - | UTC 时区开始时间 |
| 9 | `start_date_local` | TEXT | - | 本地时区开始时间 |
| 10 | `location_country` | TEXT | - | 地理位置（逆地理编码结果） |
| 11 | `summary_polyline` | TEXT | - | 路线编码 polyline 字符串 |
| 12 | `average_heartrate` | FLOAT | - | 平均心率（bpm） |
| 13 | `max_heartrate` | FLOAT | - | 最大心率（bpm） |
| 14 | `average_speed` | FLOAT | - | 平均速度（m/s） |
| 15 | `max_speed` | FLOAT | - | 最大速度（m/s） |
| 16 | `average_cadence` | FLOAT | - | 平均步频（spm） |
| 17 | `calories` | FLOAT | - | 卡路里消耗（kcal） |
| 18 | `device_name` | TEXT | - | 记录设备名称 |
| 19 | `elevation_gain` | FLOAT | - | 海拔爬升（米） |
| 20 | `elev_high` | FLOAT | - | 最高海拔（米） |
| 21 | `elev_low` | FLOAT | - | 最低海拔（米） |

> **注意**：`streak`（连续跑步天数）是 Python 运行时在 `Generator.load()` 中根据 `start_date_local` 动态计算的属性，**不存储在数据库中**。

---

### 表 2：`activity_laps` — 活动圈/分段表

存储每个活动的圈（lap）数据，一条活动可包含多个圈。

| 序号 | 字段名 | 类型 | 约束 | 说明 |
|:---:|--------|------|------|------|
| 1 | `id` | INTEGER | **PRIMARY KEY**（自增） | 主键 |
| 2 | `activity_id` | INTEGER | **INDEX** | 外键，关联 `activities.run_id` |
| 3 | `lap_index` | INTEGER | - | 圈数序号，从 1 开始 |
| 4 | `distance` | FLOAT | - | 该圈距离（米） |
| 5 | `elapsed_time` | INTEGER | - | 该圈总耗时（秒） |
| 6 | `moving_time` | INTEGER | - | 该圈移动时间（秒） |
| 7 | `average_speed` | FLOAT | - | 该圈平均速度（m/s） |
| 8 | `average_heartrate` | FLOAT | - | 该圈平均心率（bpm） |
| 9 | `total_elevation_gain` | FLOAT | - | 该圈海拔爬升（米） |
| 10 | `start_date` | TEXT | - | 该圈开始时间 |

---

### 表 3：`activity_streams` — 活动数据流表

存储每个活动的时序数据流，一条活动可为每种类型存储一条数据流记录。

| 序号 | 字段名 | 类型 | 约束 | 说明 |
|:---:|--------|------|------|------|
| 1 | `id` | INTEGER | **PRIMARY KEY**（自增） | 主键 |
| 2 | `activity_id` | INTEGER | **INDEX** | 外键，关联 `activities.run_id` |
| 3 | `stream_type` | TEXT | - | 数据流类型（见下表） |
| 4 | `data` | TEXT | - | JSON 数组格式的流数据 |

**`stream_type` 取值**：

| 类型值 | 说明 |
|--------|------|
| `heartrate` | 心率数据流（bpm 数组） |
| `velocity_smooth` | 平滑速度数据流（m/s 数组） |
| `altitude` | 海拔数据流（米 数组） |
| `distance` | 距离数据流（米 数组） |
| `time` | 时间数据流（秒 数组） |

---

## 索引

| 表名 | 索引字段 | 类型 |
|------|---------|------|
| `activities` | `run_id` | PRIMARY KEY |
| `activity_laps` | `id` | PRIMARY KEY |
| `activity_laps` | `activity_id` | INDEX |
| `activity_streams` | `id` | PRIMARY KEY |
| `activity_streams` | `activity_id` | INDEX |

---

## Schema 迁移机制

代码中未显式声明 `ALTER TABLE`，但存在 `add_missing_columns()` 函数（`db.py` 第 346-363 行），实现了**自动列迁移**：

- 每次调用 `init_db()` 时，会自动对比 ORM 模型与数据库实际列
- 如果 ORM 模型中定义了但数据库中不存在的列，会自动执行 `ALTER TABLE ADD COLUMN`
- 这意味着**只需修改 ORM 模型即可使数据库 schema 自动演进**，无需手写 DDL 迁移脚本

---

## 前端 TypeScript 接口映射

前端通过 `src/utils/utils.ts` 定义了与数据库完全对应的 TypeScript 接口：

```typescript
// activities 表 + streaks + 关联数据
interface Activity {
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

// activity_laps 表
interface Lap {
  lap_index: number;
  distance: number;
  elapsed_time: number;
  moving_time: number;
  average_speed?: number;
  average_heartrate?: number;
  total_elevation_gain?: number;
  start_date?: string | null;
}

// activity_streams 表
interface ActivityStreams {
  heartrate?: number[];
  velocity_smooth?: number[];
  altitude?: number[];
  distance?: number[];
  time?: number[];
}
```

---

## 数据流全景

```
[Strava API / GPX文件 / 第三方App]
           │
           ▼
  各 sync 脚本 (strava_sync, garmin_sync, nike_sync 等)
           │
           ▼
  Generator.sync() / sync_from_data_dir() / sync_from_app()
           │
           ▼
  update_or_create_activity() / update_or_create_lap() / update_or_create_stream()
           │
           ▼
  ┌──────────────────────────────────────┐
  │        run_page/data.db             │
  │  ┌────────────────────────────────┐ │
  │  │  activities (主活动数据)        │ │
  │  │  activity_laps (圈数据)         │ │
  │  │  activity_streams (时序数据流)   │ │
  │  └────────────────────────────────┘ │
  └──────────────────────────────────────┘
           │
           ▼
  Generator.load() → 组装成 [{activity + laps + streams}, ...]
           │
           ▼
  regenerate_json.py → activities.json（前端数据源）
           │
           ▼
  src/utils/utils.ts（Activity / Lap / ActivityStreams 接口）
           │
           ▼
  React 组件消费（RunMap, RunDetailPanel, ActivityStats 等）
```

---

## 相关文件索引

| 文件 | 说明 |
|------|------|
| `run_page/generator/db.py` | ORM 模型定义 + `init_db()` + `add_missing_columns()` |
| `run_page/generator/__init__.py` | 数据加载与同步逻辑 |
| `src/utils/utils.ts` | 前端 TypeScript 接口定义 |
| `src/static/activities.json` | 前端直接消费的 JSON 数据（由 data.db 导出） |
| `check_data.py` | 数据检查脚本 |
