# interval_icu_sync.py 设计文档

## 概述

从 [Intervals.icu API v1](https://intervals.icu/api/v1) 同步活动数据到本地 `run_page/data.db`（SQLite），并自动生成前端使用的 `src/static/activities.json`。

---

## API 信息

- **Base URL**: `https://intervals.icu/api/v1`
- **认证方式**: HTTP Basic Auth（用户名固定 `API_KEY`，密码为用户的 API Key）
- **速率限制**: 建议每请求间隔 1 秒
- **Swagger 文档**: `https://intervals.icu/api/v1/docs/swagger-ui/index.html`
- **活动 ID 格式**: `i12345`（带 `i` 前缀，如 `i163877881`）

### 本同步脚本使用的端点

| 端点                                  | 用途                               | 每活动调用           |
| ------------------------------------- | ---------------------------------- | -------------------- |
| `GET /api/v1/athlete/{id}/activities` | 获取活动列表（元数据）             | 1 次（列表）         |
| `GET /api/v1/activity/{id}/map`       | 获取 polyline 路线坐标             | 1 次（室内活动跳过） |
| `GET /api/v1/activity/{id}/streams`   | 获取数据流（心率/速度/海拔等时序） | 1 次                 |
| `GET /api/v1/activity/{id}/intervals` | 获取分段/圈数据                    | 1 次                 |

> 总计：室外活动每活动 4 次 API 请求，室内活动（sub_type 为 `Treadmill`、`IndoorWalking`）跳过 `/map`，共 3 次（列表分页不计入）。

---

## 已确认的设计决策

### 1. 字段映射策略：最小映射

仅映射 activities 表现有的 21 个字段，不扩展 schema。

**映射关系表**：

| activities 表字段   | API 来源                            | 说明                                                     |
| ------------------- | ----------------------------------- | -------------------------------------------------------- |
| `run_id`            | `activity["id"]` 去 `i` 前缀 + 偏移 | `100000000 + 数字部分`                                   |
| `name`              | `activity["name"]`                  |                                                          |
| `distance`          | `activity["distance"]`              | 单位：米                                                 |
| `moving_time`       | `activity["moving_time"]`           | 秒数 → timedelta                                         |
| `elapsed_time`      | `activity["elapsed_time"]`          | 秒数 → timedelta                                         |
| `type`              | `activity["type"]`                  | 直接透传                                                 |
| `subtype`           | `activity["sub_type"]`              |                                                          |
| `start_date`        | `activity["start_date"]`            | UTC 格式                                                 |
| `start_date_local`  | `activity["start_date_local"]`      | 本地时间格式                                             |
| `summary_polyline`  | `/map` 端点 → polyline 编码         | 详见第 2 点                                              |
| `average_heartrate` | `activity["average_heartrate"]`     | bpm                                                      |
| `max_heartrate`     | `activity["max_heartrate"]`         | bpm                                                      |
| `average_speed`     | `activity["average_speed"]`         | **注意：API 返回单位未确认，需验证并用 `/streams` 校验** |
| `max_speed`         | `activity["max_speed"]`             | 同上                                                     |
| `average_cadence`   | `activity["average_cadence"]`       | spm                                                      |
| `calories`          | `activity["calories"]`              | kcal                                                     |
| `device_name`       | `activity["device_name"]`           |                                                          |
| `elevation_gain`    | `activity["total_elevation_gain"]`  | 米                                                       |
| `elev_high`         | `activity["max_altitude"]`          | 米                                                       |
| `elev_low`          | `activity["min_altitude"]`          | 米                                                       |
| `location_country`  | —                                   | 暂不填充                                                 |

### 2. 路线数据 (polyline)：从 `/map` 端点获取

**不再需要下载 GPX/FIT 文件**。`/map` 端点直接返回路线坐标：

```json
{
  "bounds": [[min_lat, min_lng], [max_lat, max_lng]],
  "latlngs": [[lat, lng], [lat, lng], ...]
}
```

处理流程：

```
sub_type 为室内白名单?
  │
  ├── 是 (Treadmill / IndoorWalking) → 跳过 /map 请求，polyline 留空
  │
  └── 否 → GET /activity/{id}/map
              │
              ├── 返回 latlngs: [[lat, lng], ...]  数组
              │     (为空时打印提示日志，建议加入白名单)
              │
              ├── 用 polyline 库编码为 polyline 字符串
              │     polyline.encode(latlngs)
              │
              └── 存入 activities.summary_polyline
```

> 坐标系说明：Interval.icu 数据的经纬度已经是 WGS-84 坐标系（与 Strava 一致），无需 GCJ-02 纠偏。

### 3. 数据流 (streams)：从 `/streams` 端点获取

端点返回一个 stream 对象数组，经实测包含以下类型：

| stream type       | 数据示例                | 存入 activity_streams         |
| ----------------- | ----------------------- | ----------------------------- |
| `time`            | `[0, 1, 2, ...]`        | `time`（秒 数组）             |
| `heartrate`       | `[91, 90, 89, ...]`     | `heartrate`（bpm 数组）       |
| `velocity_smooth` | `[2.713, 2.652, ...]`   | `velocity_smooth`（m/s 数组） |
| `distance`        | `[0.0, 2.32, 4.5, ...]` | `distance`（米 数组）         |
| `altitude`        | `[79.6, 79.6, ...]`     | `altitude`（米 数组）         |

> 实际还返回 `watts`、`cadence`、`latlng`、`torque`、`fixed_altitude` 等，但 DB 的 `activity_streams` 表不需要这些类型，可忽略。

写入方式：复用 `update_or_create_stream(session, activity_id, stream_type, data_list)`。

### 4. 分段数据 (laps)：从 `/intervals` 端点获取

端点返回活动详情 + `icu_intervals` 数组。经实测每条 interval 包含以下关键字段：

| ICU interval 字段                                       | 映射到 activity_laps                                  |
| ------------------------------------------------------- | ----------------------------------------------------- |
| `distance`                                              | `distance`                                            |
| `moving_time`                                           | `moving_time`（秒）                                   |
| `elapsed_time`                                          | `elapsed_time`（秒）                                  |
| `average_speed` / `min_speed` / `max_speed`             | `average_speed`（平均）                               |
| `average_heartrate` / `min_heartrate` / `max_heartrate` | `average_heartrate`                                   |
| `average_cadence`                                       | —（activity_laps 无此字段，忽略）                     |
| `total_elevation_gain`                                  | `total_elevation_gain`                                |
| `start_time`                                            | `start_date`（相对活动的秒偏移，需加活动 start_date） |
| `type`                                                  | —（mark: WORK/RECOVERY）                              |
| `label`                                                 | —                                                     |

> 注意：`activity_laps` 表仅有 10 个字段，不需要扩展 schema。interval 中的 `type`、`label`、功率系列等字段暂不存储。

写入方式：复用 `update_or_create_lap(session, activity_id, lap_data, lap_index)`。

### 5. 凭据传入：CLI 优先 + 环境变量兜底

```
优先级: CLI 位置参数 > 环境变量

环境变量:
  INTERVAL_ATHLETE_ID     # 运动员 ID（如 i489589）
  INTERVAL_API_KEY        # API Key
```

CLI 用法：

```bash
# 使用 CLI 参数
python run_page/interval_icu_sync.py <athlete_id> <api_key>

# 使用环境变量
python run_page/interval_icu_sync.py

# 混合使用（CLI 覆盖环境变量）
python run_page/interval_icu_sync.py <athlete_id> <api_key>
```

### 6. 同步模式：组合 flag

| 参数                                | 行为                                            |
| ----------------------------------- | ----------------------------------------------- |
| 默认（无参数）                      | **增量同步**：从 DB 最新日期 - 7 天开始，到当日 |
| `--full`                            | **全量同步**：从 `2015-01-01` 到当日            |
| `--from YYYY-MM-DD --to YYYY-MM-DD` | **指定范围**                                    |

互斥性规则：

- `--full` 与 `--from/--to` 同时指定时报错
- `--from` 和 `--to` 必须同时指定或都不指定
- 增量模式的 `oldest` 为「DB 最新日期 - 7 天」（与 `strava_sync` 保持一致，7 天重叠窗口避免漏数据）

### 7. 活动类型过滤

- **默认**：同步全部活动类型
- **`--only-run`**：仅同步 `Run`、`VirtualRun`、`TrailRun`（客户端本地过滤）

### 8. 活动 ID 处理：偏移策略

```
Interval.icu ID:   i163877881
去掉 'i' 前缀:     163877881
存储的 run_id:     100000000 + 163877881 = 263877881
```

- 理由：避免与其他数据源的纯数字 ID 碰撞
- 存储后 `run_id` 为 `INTEGER`，前端 `run_id` 也是 `number`，兼容

### 9. JSON 生成：同步脚本内置

同步完成后自动执行 `Generator.load()` 并写入 `src/static/activities.json`。

---

## 实现架构

### 文件结构

```
run_page/
├── interval_icu_sync.py      # 新建：主同步脚本
├── generator/
│   ├── __init__.py           # 不修改
│   └── db.py                 # 不修改
├── config.py                 # 不修改
└── polyline_processor.py     # 不修改（polyline 过滤用）
```

### 核心流程

```
┌──────────────────────────────────────────────────────────┐
│                  interval_icu_sync.py                    │
│                                                          │
│  1. 解析参数 / 环境变量                                   │
│  2. 确定同步模式（增量/全量/日期范围）                    │
│  3. 初始化 Generator (DB session)                        │
│                                                          │
│  activities = GET /athlete/{id}/activities               │
│                                                          │
│  for each activity in activities:                        │
│    ├── 活动类型过滤（--only-run 模式下）                   │
│    │                                                     │
│    ├── 映射活动元数据 → IntervalActivity 适配对象         │
│    ├── update_or_create_activity(session, obj)            │
│    │                                                     │
│    ├── 室内活动? (sub_type 白名单判断)                     │
│    │   ├── 是 → 跳过 /map，summary_polyline 留空          │
│    │   └── 否 → GET /activity/{id}/map → 转 polyline      │
│    │       └── 更新 activity.summary_polyline             │
│    │       └── latlngs 为空时打印建议日志                  │
│    │                                                     │
│    ├── GET /activity/{id}/streams  → 遍历 stream 类型     │
│    │   └── update_or_create_stream(session, id, type, d)  │
│    │                                                     │
│    └── GET /activity/{id}/intervals  → 遍历 intervals     │
│        └── update_or_create_lap(session, id, lap, idx)    │
│                                                          │
│  4. session.commit()                                     │
│  5. Generator.load() → 写入 activities.json               │
└──────────────────────────────────────────────────────────┘
```

### 数据适配层

`update_or_create_activity()` 期望接收类 stravalib 的 activity 对象。需要适配类：

```python
class IntervalActivity:
    """将 Interval.icu API JSON 适配为 update_or_create_activity() 期望的格式"""
    def __init__(self, api_data, polyline=""):
        numeric_id = int(api_data["id"].lstrip("i"))
        self.id = 100000000 + numeric_id
        self.name = api_data.get("name", "")
        self.distance = api_data.get("distance", 0) or 0
        self.moving_time = timedelta(seconds=api_data.get("moving_time", 0))
        self.elapsed_time = timedelta(seconds=api_data.get("elapsed_time", 0))
      self.type = api_data.get("type", "")
        self.subtype = api_data.get("sub_type", "")
        self.start_date = api_data.get("start_date", "")
        self.start_date_local = api_data.get("start_date_local", "")
        # 模拟 stravalib 的 .map.summary_polyline
        self.map = MapProxy(polyline)
        # ... 其他字段
```

### 速率控制

| 操作                      | 延迟                            |
| ------------------------- | ------------------------------- |
| 活动列表请求              | `time.sleep(1)`                 |
| 每条活动的 map 请求       | `time.sleep(1)`（室内活动跳过） |
| 每条活动的 streams 请求   | `time.sleep(1)`                 |
| 每条活动的 intervals 请求 | `time.sleep(1)`                 |

每活动 3-4 次 API 请求（室内 3 次，室外 4 次），总计约 3-4 秒延迟。

### 错误处理

| 场景                                     | 策略                                                                                |
| ---------------------------------------- | ----------------------------------------------------------------------------------- |
| API 请求失败                             | 重试 3 次（指数退避），失败则打印并跳过该活动                                       |
| 室内活动 (`Treadmill` / `IndoorWalking`) | 跳过 `/map` 请求，`summary_polyline` 留空，正常处理 `/streams` 和 `/intervals`      |
| `/map` 返回空或无 latlngs                | polyline 留空，打印提示日志（建议将当前 sub_type 加入室内白名单），其他数据继续写入 |
| `/streams` 返回空或部分类型缺失          | 已有 stream 类型的继续写入，缺失的跳过                                              |
| `/intervals` 无 `icu_intervals`          | 跳过 laps，不报错（很多活动确实没有 interval）                                      |
| DB 写入失败                              | rollback 单条活动，继续下一条                                                       |

### 边界情况

- **列表为空**：打印提示，正常退出
- **全部已同步**（增量模式无新数据）：打印「已是最新」，正常退出
- **活动无坐标数据**（如室内跑步/步行 `sub_type` 为 `Treadmill` / `IndoorWalking`）：通过白名单主动跳过 `/map` 请求，`summary_polyline` 直接留空，节省 API 调用
- **未知 sub_type 返回空 latlngs**：打印 `[INFO]` 提示日志，建议将对应 sub_type 加入 `INDOOR_SUB_TYPES` 白名单
- **intervals 为空**（自由跑无分段）：/intervals 返回 `icu_intervals: []`，正常跳过

---

## 验收测试

1. `python run_page/interval_icu_sync.py i489589` 默认增量运行成功
2. `python run_page/interval_icu_sync.py i489589 --full` 全量运行成功
3. `python run_page/interval_icu_sync.py i489589 --from 2024-01-01 --to 2024-06-30` 日期范围成功
4. `python run_page/interval_icu_sync.py i489589 --only-run` 仅跑步类型成功
5. DB 中 `activities` 表有新记录，`run_id` 在 `100000000+` 范围
6. `activity_laps` 表有分段数据（分段数与 `icu_lap_count` 一致）
7. `activity_streams` 表有 heartrate / velocity_smooth / altitude / distance / time 五类数据
8. 有坐标的活动在前端地图上可显示路线（`summary_polyline` 非空）
9. `src/static/activities.json` 已更新，包含 laps 和 streams
10. 重复运行不产生重复记录（update 而非 insert）
11. 室内活动（`sub_type` 为 `Treadmill` / `IndoorWalking`）不调用 `/map` 端点，`summary_polyline` 为空字符串
12. 室内活动正常写入 `/streams` 和 `/intervals` 数据，前端显示为「跑步机」标题
