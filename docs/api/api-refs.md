# Strava API 参考文档

本文档整理了 Strava API v3 中获取活动数据的相关端点，用于数据同步功能开发参考。

## 目录

- [认证说明](#认证说明)
- [Activities API](#activities-api)
  - [获取活动详情 (getActivityById)](#获取活动详情-getactivitybyid)
  - [获取活动圈数 (getLapsByActivityId)](#获取活动圈数-getlapsbyactivityid)
  - [获取运动员活动列表 (getLoggedInAthleteActivities)](#获取运动员活动列表-getloggedinathleteactivities)
- [Streams API](#streams-api)
  - [获取活动数据流 (getActivityStreams)](#获取活动数据流-getactivitystreams)
- [Athletes API](#athletes-api)
  - [获取当前运动员信息 (getLoggedInAthlete)](#获取当前运动员信息-getloggedinathlete)
  - [获取运动员统计 (getStats)](#获取运动员统计-getstats)
- [数据模型说明](#数据模型说明)
- [Polyline 编码说明](#polyline-编码说明)

---

## 认证说明

Strava API 使用 OAuth 2.0 认证协议。所有 API 请求需要在 Header 中携带 Access Token：

```
Authorization: Bearer <access_token>
```

### 权限范围 (Scopes)

| Scope | 说明 |
|-------|------|
| `activity:read` | 读取公开活动和关注者可见的活动 |
| `activity:read_all` | 读取所有活动（包括私密活动） |
| `profile:read_all` | 读取完整个人资料 |
| `activity:write` | 创建和修改活动 |

### Token 刷新

Access Token 有效期为 6 小时，需要使用 Refresh Token 刷新：

```bash
POST https://www.strava.com/oauth/token
Content-Type: application/x-www-form-urlencoded

client_id=<client_id>
client_secret=<client_secret>
grant_type=refresh_token
refresh_token=<refresh_token>
```

---

## Activities API

### 获取活动详情 (getActivityById)

返回指定活动的详细信息。

**端点：** `GET /api/v3/activities/{id}`

**权限要求：**
- `activity:read` - 读取公开活动和关注者可见的活动
- `activity:read_all` - 读取私密活动

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | long | 是 | 活动 ID（路径参数） |
| `include_all_efforts` | boolean | 否 | 是否包含所有 segment efforts |

**请求示例：**

```bash
GET "https://www.strava.com/api/v3/activities/{id}?include_all_efforts="
Authorization: Bearer <token>
```

**响应字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | long | 活动唯一标识符 |
| `resource_state` | int | 数据详细程度（1=概要, 2=详细, 3=完整） |
| `external_id` | string | 外部系统 ID（如 Garmin 推送的 ID） |
| `upload_id` | long | 上传 ID |
| `athlete` | object | 运动员信息（id, resource_state） |
| `name` | string | 活动名称 |
| `distance` | float | 总距离（单位：米） |
| `moving_time` | int | 移动时间（单位：秒） |
| `elapsed_time` | int | 总耗时（单位：秒，含暂停时间） |
| `total_elevation_gain` | float | 总爬升高度（单位：米） |
| `type` | string | 活动类型（Run, Ride, Swim 等） |
| `sport_type` | string | 运动子类型（MountainBikeRide, TrailRun 等） |
| `start_date` | string | 开始时间（UTC，ISO 8601 格式） |
| `start_date_local` | string | 开始时间（本地时区，ISO 8601 格式） |
| `timezone` | string | 时区信息 |
| `utc_offset` | int | UTC 偏移秒数 |
| `start_latlng` | array | 起点坐标 `[纬度, 经度]` |
| `end_latlng` | array | 终点坐标 `[纬度, 经度]` |
| `achievement_count` | int | 成就数量 |
| `kudos_count` | int | 点赞数 |
| `comment_count` | int | 评论数 |
| `athlete_count` | int | 参与运动员数量 |
| `photo_count` | int | 照片数量 |
| `map` | object | 地图信息（包含 polyline 轨迹） |
| `trainer` | boolean | 是否为室内训练 |
| `commute` | boolean | 是否为通勤活动 |
| `manual` | boolean | 是否为手动添加 |
| `private` | boolean | 是否为私密活动 |
| `gear_id` | string | 装备 ID |
| `average_speed` | float | 平均速度（单位：米/秒） |
| `max_speed` | float | 最大速度（单位：米/秒） |
| `average_cadence` | float | 平均踏频/步频 |
| `average_temp` | int | 平均温度 |
| `average_watts` | float | 平均功率（骑行活动） |
| `weighted_average_watts` | float | 加权平均功率 |
| `kilojoules` | float | 能量消耗（kJ） |
| `device_watts` | boolean | 是否使用功率计 |
| `has_heartrate` | boolean | 是否有心率数据 |
| `average_heartrate` | float | 平均心率 |
| `max_heartrate` | float | 最大心率 |
| `elev_high` | float | 最高海拔 |
| `elev_low` | float | 最低海拔 |
| `calories` | float | 消耗热量 |
| `device_name` | string | 设备名称 |

**Map 对象说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 地图 ID |
| `polyline` | string | 完整轨迹编码（Google Polyline 编码格式） |
| `summary_polyline` | string | 简化轨迹编码（适用于列表展示） |
| `resource_state` | int | 数据详细程度 |

**响应示例：**

```json
{
  "id": 12345678987654321,
  "resource_state": 3,
  "external_id": "garmin_push_12345678987654321",
  "upload_id": 98765432123456789,
  "athlete": {
    "id": 134815,
    "resource_state": 1
  },
  "name": "Happy Friday",
  "distance": 28099,
  "moving_time": 4207,
  "elapsed_time": 4410,
  "total_elevation_gain": 516,
  "type": "Ride",
  "sport_type": "MountainBikeRide",
  "start_date": "2018-02-16T14:52:54Z",
  "start_date_local": "2018-02-16T06:52:54Z",
  "timezone": "(GMT-08:00) America/Los_Angeles",
  "utc_offset": -28800,
  "start_latlng": [37.83, -122.26],
  "end_latlng": [37.83, -122.26],
  "achievement_count": 0,
  "kudos_count": 19,
  "comment_count": 0,
  "athlete_count": 1,
  "photo_count": 0,
  "map": {
    "id": "a1410355832",
    "polyline": "ki{eFvqfiVqAWQIGEEKAYJgBVqDJ{BHa@jAkNJw@Pw@V{APs@^aABQAOEQGKoJ_FuJkFqAo@...",
    "summary_polyline": "ki{eFvqfiVsBmA`Feh@qg@iX`B}JeCcCqGjIq~@kf@cM{KeHeX`@_GdGkSeBiXtB}YuEkP...",
    "resource_state": 3
  },
  "trainer": false,
  "commute": false,
  "manual": false,
  "private": false,
  "gear_id": "b12345678987654321",
  "average_speed": 6.679,
  "max_speed": 18.5,
  "average_cadence": 78.5,
  "average_watts": 185.5,
  "device_name": "Garmin Edge 1030",
  "calories": 870.2
}
```

---

### 获取活动圈数 (getLapsByActivityId)

返回指定活动的圈数数据，适用于间歇训练或多圈运动。

**端点：** `GET /api/v3/activities/{id}/laps`

**权限要求：**
- `activity:read` - 读取公开活动
- `activity:read_all` - 读取私密活动

**请求示例：**

```bash
GET "https://www.strava.com/api/v3/activities/{id}/laps"
Authorization: Bearer <token>
```

**响应字段说明：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | long | 圈数 ID |
| `name` | string | 圈名称（如 "Lap 1"） |
| `elapsed_time` | int | 该圈总耗时（秒） |
| `moving_time` | int | 该圈移动时间（秒） |
| `start_date` | string | 该圈开始时间（UTC） |
| `start_date_local` | string | 该圈开始时间（本地） |
| `distance` | float | 该圈距离（米） |
| `total_elevation_gain` | float | 该圈爬升（米） |
| `average_speed` | float | 该圈平均速度（米/秒） |
| `max_speed` | float | 该圈最大速度（米/秒） |
| `average_cadence` | float | 该圈平均踏频/步频 |
| `average_watts` | float | 该圈平均功率 |
| `lap_index` | int | 圈序号 |
| `split` | int | 分割类型 |

**响应示例：**

```json
[
  {
    "id": 12345678987654321,
    "resource_state": 2,
    "name": "Lap 1",
    "activity": {
      "id": 12345678987654321,
      "resource_state": 1
    },
    "athlete": {
      "id": 12345678987654321,
      "resource_state": 1
    },
    "elapsed_time": 1691,
    "moving_time": 1587,
    "start_date": "2018-02-08T14:13:37Z",
    "start_date_local": "2018-02-08T06:13:37Z",
    "distance": 8046.72,
    "total_elevation_gain": 270,
    "average_speed": 4.76,
    "max_speed": 9.4,
    "average_cadence": 79,
    "average_watts": 228.2,
    "lap_index": 1,
    "split": 1
  }
]
```

---

### 获取运动员活动列表 (getLoggedInAthleteActivities)

获取当前认证运动员的活动列表，是数据同步的核心端点。

**端点：** `GET /api/v3/athlete/activities`

**权限要求：** `activity:read` 或 `activity:read_all`

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `before` | int | 否 | Unix 时间戳，获取此时间之前的活动 |
| `after` | int | 否 | Unix 时间戳，获取此时间之后的活动 |
| `page` | int | 否 | 页码（默认 1） |
| `per_page` | int | 否 | 每页数量（默认 30，最大 200） |

**请求示例：**

```bash
# 获取最近 50 条活动
GET "https://www.strava.com/api/v3/athlete/activities?per_page=50"
Authorization: Bearer <token>

# 获取指定时间之后的活动
GET "https://www.strava.com/api/v3/athlete/activities?after=1609459200&per_page=100"
Authorization: Bearer <token>

# 获取指定时间之前的活动
GET "https://www.strava.com/api/v3/athlete/activities?before=1640995200&page=1&per_page=200"
Authorization: Bearer <token>
```

**响应说明：**

返回 **SummaryActivity** 对象数组，字段与 DetailedActivity 类似但更简洁。

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | long | 活动 ID |
| `name` | string | 活动名称 |
| `distance` | float | 距离（米） |
| `moving_time` | int | 移动时间（秒） |
| `elapsed_time` | int | 总时间（秒） |
| `total_elevation_gain` | float | 爬升（米） |
| `type` | string | 活动类型 |
| `start_date` | string | 开始时间（UTC） |
| `start_date_local` | string | 开始时间（本地） |
| `timezone` | string | 时区 |
| `map.summary_polyline` | string | 简化轨迹编码 |

**响应示例：**

```json
[
  {
    "id": 12345678901234,
    "name": "Morning Run",
    "distance": 5000,
    "moving_time": 1500,
    "elapsed_time": 1650,
    "total_elevation_gain": 50,
    "type": "Run",
    "start_date": "2024-01-15T08:00:00Z",
    "start_date_local": "2024-01-15T16:00:00Z",
    "timezone": "(GMT+08:00) Asia/Shanghai",
    "map": {
      "summary_polyline": "ki{eFvqfiVsBmA`Feh@qg@iX..."
    }
  }
]
```

---

## Streams API

### 获取活动数据流 (getActivityStreams)

获取活动的详细时序数据（GPS 坐标、心率、功率等），用于绘制精确轨迹图和详细分析。

**端点：** `GET /api/v3/activities/{id}/streams`

**权限要求：** `activity:read` 或 `activity:read_all`

**请求参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `keys` | string | 是 | 需要获取的数据流类型，逗号分隔 |
| `key_by_type` | boolean | 否 | 是否按类型分组返回 |

**可用的 Stream 类型：**

| 类型 | 说明 |
|------|------|
| `time` | 时间戳序列（秒） |
| `distance` | 累计距离序列（米） |
| `latlng` | GPS 坐标序列 `[纬度, 经度]` |
| `altitude` | 海拔序列（米） |
| `velocity_smooth` | 平滑速度序列（米/秒） |
| `heartrate` | 心率序列（bpm） |
| `cadence` | 踏频/步频序列 |
| `watts` | 功率序列（瓦特） |
| `temp` | 温度序列 |
| `moving` | 移动状态序列（boolean） |
| `grade_smooth` | 平滑坡度序列（%） |

**请求示例：**

```bash
# 获取 GPS 坐标、时间、距离、海拔数据
GET "https://www.strava.com/api/v3/activities/{id}/streams?keys=latlng,time,distance,altitude"
Authorization: Bearer <token>

# 获取心率、功率、踏频数据
GET "https://www.strava.com/api/v3/activities/{id}/streams?keys=heartrate,watts,cadence"
Authorization: Bearer <token>
```

**响应示例：**

```json
{
  "latlng": {
    "type": "latlng",
    "data": [
      [37.83, -122.26],
      [37.83, -122.27],
      [37.84, -122.28]
    ],
    "series_type": "distance",
    "original_size": 1000,
    "resolution": "low"
  },
  "time": {
    "type": "time",
    "data": [0, 1, 2, 3, 4, 5],
    "series_type": "distance",
    "original_size": 1000,
    "resolution": "low"
  },
  "altitude": {
    "type": "altitude",
    "data": [100, 102, 105, 108, 110],
    "series_type": "distance",
    "original_size": 1000,
    "resolution": "low"
  }
}
```

---

## Athletes API

### 获取当前运动员信息

**端点：** `GET /api/v3/athlete`

**权限要求：** `profile:read_all`

**响应示例：**

```json
{
  "id": 134815,
  "username": "marianne_v",
  "resource_state": 3,
  "firstname": "Marianne",
  "lastname": "V",
  "city": "Oakland",
  "state": "CA",
  "country": "United States",
  "sex": "F",
  "premium": true,
  "created_at": "2018-02-16T14:52:54Z",
  "updated_at": "2024-01-15T08:00:00Z",
  "profile_medium": "https://...",
  "profile": "https://...",
  "follower_count": 100,
  "friend_count": 50,
  "measurement_preference": "meters"
}
```

### 获取运动员统计

**端点：** `GET /api/v3/athletes/{id}/stats`

**权限要求：** `activity:read`

**响应示例：**

```json
{
  "recent_run_totals": {
    "count": 10,
    "distance": 50000,
    "moving_time": 15000,
    "elapsed_time": 16500,
    "elevation_gain": 500,
    "achievement_count": 5
  },
  "all_run_totals": {
    "count": 100,
    "distance": 500000,
    "moving_time": 150000,
    "elapsed_time": 165000,
    "elevation_gain": 5000
  },
  "ytd_run_totals": {
    "count": 50,
    "distance": 250000,
    "moving_time": 75000,
    "elevation_gain": 2500
  }
}
```

---

## 数据模型说明

### Resource State（数据详细程度）

Strava API 返回的数据根据 `resource_state` 字段区分详细程度：

| 值 | 级别 | 说明 |
|----|------|------|
| 1 | Meta | 最基础信息，仅包含 ID |
| 2 | Summary | 概要信息，适合列表展示 |
| 3 | Detailed | 完整详细信息 |

### Activity Type（活动类型）

常见活动类型：

| 类型 | 说明 |
|------|------|
| `Run` | 跑步 |
| `Ride` | 骑行 |
| `Swim` | 游泳 |
| `Walk` | 步行 |
| `Hike` | 徒步 |
| `VirtualRide` | 虚拟骑行 |
| `VirtualRun` | 虚拟跑步 |
| `AlpineSki` | 高山滑雪 |
| `NordicSki` | 北欧滑雪 |
| `Snowboard` | 单板滑雪 |
| `Rowing` | 划船 |
| `Kayaking` | 皮划艇 |
| `Canoeing` | 独木舟 |
| `Yoga` | 瑜伽 |
| `WeightTraining` | 力量训练 |

---

## Polyline 编码说明

Strava 使用 Google Polyline 编码格式压缩 GPS 轨迹数据。

### 解码示例（Python）

```python
import polyline

# 解码 polyline 字符串
coords = polyline.decode("ki{eFvqfiVsBmA`Feh@qg@iX...")
# 返回: [(37.83, -122.26), (37.83, -122.27), ...]

# 编码坐标列表
encoded = polyline.encode([(37.83, -122.26), (37.84, -122.28)])
```

### 安装 polyline 库

```bash
pip install polyline
```

---

## API 速率限制

| 限制类型 | 免费用户 | 付费用户 |
|----------|----------|----------|
| 15分钟请求量 | 100 | 600 |
| 每日请求量 | 1000 | 6000 |

超出限制将返回 `403 Forbidden` 错误。

---

## 参考链接

- [Strava API 官方文档](https://developers.strava.com/docs/reference/)
- [Strava OAuth 认证文档](https://developers.strava.com/docs/authentication/)
- [stravalib Python 库](https://github.com/stravalib/stravalib)

---

> **数据来源声明：** 如果你的应用显示来自 Garmin 等设备的数据，请在应用中显示适当的数据来源归属，例如："Data from Garmin Forerunner"。