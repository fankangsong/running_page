# Intervals.icu API v1 接口文档

## 通用信息

- **Base URL**: `https://intervals.icu/api/v1`
- **认证方式**: HTTP Basic Auth
  - 用户名: 固定为 `API_KEY`: `xxx`
  - 密码: 用户的 API Key
- **请求头**: `Accept: application/json`
- **速率控制**: 建议每次请求间隔 1 秒 (`time.sleep(1)`)

---

## 1. 获取活动列表

### 请求

```
GET /api/v1/athlete/{athlete_id}/activities?oldest={oldest}&newest={newest}
```

### 路径参数

| 参数       | 类型   | 说明                    |
| ---------- | ------ | ----------------------- |
| athlete_id | string | Intervals.icu 运动员 ID |

### Query 参数

| 参数   | 类型          | 必填 | 说明     | 示例         |
| ------ | ------------- | ---- | -------- | ------------ |
| oldest | string (date) | 是   | 最早日期 | `2015-01-01` |
| newest | string (date) | 是   | 最晚日期 | `2026-07-08` |

### 返回字段

返回 JSON 数组，每个元素包含：

```json
  {
    "id": "string",
    "start_date_local": "string",
    "type": "string",
    "icu_ignore_time": false,
    "icu_pm_cp": 0,
    "icu_pm_w_prime": 0,
    "icu_pm_p_max": 0,
    "icu_pm_ftp": 0,
    "icu_pm_ftp_secs": 0,
    "icu_pm_ftp_watts": 0,
    "icu_ignore_power": false,
    "icu_rolling_cp": 0,
    "icu_rolling_w_prime": 0,
    "icu_rolling_p_max": 0,
    "icu_rolling_ftp": 0,
    "icu_rolling_ftp_delta": 0,
    "icu_training_load": 0,
    "icu_atl": 0,
    "icu_ctl": 0,
    "ss_p_max": 0,
    "ss_w_prime": 0,
    "ss_cp": 0,
    "paired_event_id": 0,
    "icu_ftp": 0,
    "icu_joules": 0,
    "icu_recording_time": 0,
    "elapsed_time": 0,
    "icu_weighted_avg_watts": 0,
    "carbs_used": 0,
    "name": "string",
    "description": "string",
    "start_date": "string",
    "distance": 0,
    "icu_distance": 0,
    "moving_time": 0,
    "coasting_time": 0,
    "total_elevation_gain": 0,
    "total_elevation_loss": 0,
    "timezone": "string",
    "trainer": false,
    "sub_type": "NONE",
    "commute": false,
    "race": false,
    "max_speed": 0,
    "average_speed": 0,
    "device_watts": false,
    "has_heartrate": false,
    "max_heartrate": 0,
    "average_heartrate": 0,
    "average_cadence": 0,
    "calories": 0,
    "average_temp": 0,
    "min_temp": 0,
    "max_temp": 0,
    "avg_lr_balance": 0,
    "gap": 0,
    "gap_model": "NONE",
    "use_elevation_correction": false,
    "gear": {
      "id": "string",
      "name": "string",
      "distance": 0,
      "primary": false
    },
    "perceived_exertion": 0,
    "device_name": "string",
    "power_meter": "string",
    "power_meter_serial": "string",
    "power_meter_battery": "string",
    "crank_length": 0,
    "external_id": "string",
    "file_sport_index": 0,
    "file_type": "string",
    "icu_athlete_id": "string",
    "created": "1970-01-01T00:00:00.000Z",
    "icu_sync_date": "1970-01-01T00:00:00.000Z",
    "analyzed": "1970-01-01T00:00:00.000Z",
    "icu_w_prime": 0,
    "p_max": 0,
    "threshold_pace": 0,
    "icu_hr_zones": [0],
    "pace_zones": [0],
    "lthr": 0,
    "icu_resting_hr": 0,
    "icu_weight": 0,
    "icu_power_zones": [0],
    "icu_sweet_spot_min": 0,
    "icu_sweet_spot_max": 0,
    "icu_power_spike_threshold": 0,
    "trimp": 0,
    "icu_warmup_time": 0,
    "icu_cooldown_time": 0,
    "icu_chat_id": 0,
    "icu_ignore_hr": false,
    "ignore_velocity": false,
    "ignore_pace": false,
    "ignore_parts": [
      {
        "start_index": 0,
        "end_index": 0,
        "power": false,
        "pace": false,
        "hr": false
      }
    ],
    "icu_training_load_data": 0,
    "interval_summary": ["string"],
    "skyline_chart_bytes": ["ZXhhbXBsZQ=="],
    "stream_types": ["string"],
    "has_weather": false,
    "has_segments": false,
    "power_field_names": ["string"],
    "power_field": "string",
    "icu_zone_times": [
      {
        "id": "string",
        "secs": 0
      }
    ],
    "icu_hr_zone_times": [0],
    "pace_zone_times": [0],
    "gap_zone_times": [0],
    "use_gap_zone_times": false,
    "custom_zones": [
      {
        "code": "string",
        "zones": [
          {
            "id": "string",
            "start": 0,
            "end": 0,
            "start_value": 0,
            "end_value": 0,
            "secs": 0
          }
        ]
      }
    ],
    "tiz_order": "POWER_HR_PACE",
    "polarization_index": 0,
    "icu_achievements": [
      {
        "id": "string",
        "type": "BEST_POWER",
        "message": "string",
        "watts": 0,
        "secs": 0,
        "value": 0,
        "distance": 0,
        "pace": 0,
        "point": {
          "start_index": 0,
          "end_index": 0,
          "secs": 0,
          "value": 0
        }
      }
    ],
    "icu_intervals_edited": false,
    "lock_intervals": false,
    "icu_lap_count": 0,
    "icu_joules_above_ftp": 0,
    "icu_max_wbal_depletion": 0,
    "icu_hrr": {
      "start_index": 0,
      "end_index": 0,
      "start_time": 0,
      "end_time": 0,
      "start_bpm": 0,
      "end_bpm": 0,
      "average_watts": 0,
      "hrr": 0
    },
    "icu_sync_error": "string",
    "icu_color": "string",
    "icu_power_hr_z2": 0,
    "icu_power_hr_z2_mins": 0,
    "icu_cadence_z2": 0,
    "icu_rpe": 0,
    "feel": 0,
    "kg_lifted": 0,
    "decoupling": 0,
    "icu_median_time_delta": 0,
    "p30s_exponent": 0,
    "workout_shift_secs": 0,
    "strava_id": "string",
    "lengths": 0,
    "pool_length": 0,
    "compliance": 0,
    "coach_tick": 0,
    "source": "STRAVA",
    "oauth_client_id": 0,
    "oauth_client_name": "string",
    "average_altitude": 0,
    "min_altitude": 0,
    "max_altitude": 0,
    "power_load": 0,
    "hr_load": 0,
    "pace_load": 0,
    "hr_load_type": "AVG_HR",
    "pace_load_type": "SWIM",
    "tags": ["string"],
    "attachments": [
      {
        "id": "string",
        "filename": "string",
        "mimetype": "string",
        "url": "string"
      }
    ],
    "recording_stops": [0],
    "average_weather_temp": 0,
    "min_weather_temp": 0,
    "max_weather_temp": 0,
    "average_feels_like": 0,
    "min_feels_like": 0,
    "max_feels_like": 0,
    "average_wind_speed": 0,
    "average_wind_gust": 0,
    "prevailing_wind_deg": 0,
    "headwind_percent": 0,
    "tailwind_percent": 0,
    "average_clouds": 0,
    "max_rain": 0,
    "max_snow": 0,
    "carbs_ingested": 0,
    "route_id": 0,
    "analysis_issues": [
      {
        "type": "script_failed",
        "message": "string",
        "custom_item_id": 0
      }
    ],
    "pace": 0,
    "athlete_max_hr": 0,
    "group": "string",
    "icu_intensity": 0,
    "icu_efficiency_factor": 0,
    "icu_power_hr": 0,
    "session_rpe": 0,
    "average_stride": 0,
    "icu_average_watts": 0,
    "icu_variability_index": 0,
    "strain_score": 0
  }
]
```

### 活动类型过滤

默认仅同步以下跑步类型：

- `Run`
- `VirtualRun`
- `TrailRun`

使用 `--all` 参数可同步全部活动类型。

---

## 2. 下载活动文件

### 请求

```
GET /api/v1/activity/{activity_id}/file
```

### 路径参数

| 参数        | 类型   | 说明                   |
| ----------- | ------ | ---------------------- |
| activity_id | string | 活动 ID（如 `i12345`） |

### Query 参数

无额外参数。

### 返回内容

- **Content-Type**: 二进制文件（GPX / TCX / FIT 格式，取决于活动的 `file_type`）
- **压缩**: 可能被 gzip 压缩，通过 magic bytes `1F 8B` 判断
- 代码自动解压 gzip 后写入本地文件

### 文件命名规则

下载后文件以纯数字 ID 命名（去掉 `i` 前缀）：

```
{numeric_id}.{file_type}
```

示例：`12345.gpx`、`12346.tcx`、`12347.fit`

---

## 附加功能：GCJ-02 坐标纠偏

使用 `--gcj02` 参数可将国内数据源（如佳明中国版）的 GCJ-02 坐标转为 WGS-84。

支持的文件格式：

| 格式 | 解析方式                                           |
| ---- | -------------------------------------------------- |
| GPX  | `gpxpy` 库解析，遍历 track/segment/point           |
| TCX  | `xml.etree.ElementTree` 解析，遍历 `Position` 节点 |
| FIT  | `fit_tool` 库解析，遍历 `RecordMessage`            |

坐标转换使用 `eviltransform.gcj2wgs_exact()` 方法。

---

## 附录：JSON 字段中文对照表

| 字段名                               | 中文翻译               |
| ------------------------------------ | ---------------------- |
| `id`                                 | 活动 ID                |
| `start_date_local`                   | 本地开始日期           |
| `type`                               | 活动类型               |
| `icu_ignore_time`                    | 忽略时间               |
| `icu_pm_cp`                          | 功率模型临界功率       |
| `icu_pm_w_prime`                     | 功率模型 W'储备        |
| `icu_pm_p_max`                       | 功率模型最大功率       |
| `icu_pm_ftp`                         | 功率模型功能性阈值功率 |
| `icu_pm_ftp_secs`                    | 功率模型 FTP 秒数      |
| `icu_pm_ftp_watts`                   | 功率模型 FTP 瓦数      |
| `icu_ignore_power`                   | 忽略功率               |
| `icu_rolling_cp`                     | 滚动临界功率           |
| `icu_rolling_w_prime`                | 滚动 W'储备            |
| `icu_rolling_p_max`                  | 滚动最大功率           |
| `icu_rolling_ftp`                    | 滚动 FTP               |
| `icu_rolling_ftp_delta`              | 滚动 FTP 变化量        |
| `icu_training_load`                  | 训练负荷               |
| `icu_atl`                            | 急性训练负荷           |
| `icu_ctl`                            | 慢性训练负荷           |
| `ss_p_max`                           | 甜点区最大功率         |
| `ss_w_prime`                         | 甜点区 W'储备          |
| `ss_cp`                              | 甜点区临界功率         |
| `paired_event_id`                    | 关联赛事 ID            |
| `icu_ftp`                            | 功能性阈值功率         |
| `icu_joules`                         | 焦耳（能量）           |
| `icu_recording_time`                 | 记录时间               |
| `elapsed_time`                       | 经过时间               |
| `icu_weighted_avg_watts`             | 加权平均功率           |
| `carbs_used`                         | 消耗碳水               |
| `name`                               | 活动名称               |
| `description`                        | 描述                   |
| `start_date`                         | 开始日期               |
| `distance`                           | 距离                   |
| `icu_distance`                       | ICU 距离               |
| `moving_time`                        | 移动时间               |
| `coasting_time`                      | 滑行时间               |
| `total_elevation_gain`               | 总爬升                 |
| `total_elevation_loss`               | 总下降                 |
| `timezone`                           | 时区                   |
| `trainer`                            | 是否骑行台             |
| `sub_type`                           | 子类型                 |
| `commute`                            | 是否通勤               |
| `race`                               | 是否比赛               |
| `max_speed`                          | 最大速度               |
| `average_speed`                      | 平均速度               |
| `device_watts`                       | 设备功率               |
| `has_heartrate`                      | 有心率数据             |
| `max_heartrate`                      | 最大心率               |
| `average_heartrate`                  | 平均心率               |
| `average_cadence`                    | 平均踏频               |
| `calories`                           | 卡路里                 |
| `average_temp`                       | 平均温度               |
| `min_temp`                           | 最低温度               |
| `max_temp`                           | 最高温度               |
| `avg_lr_balance`                     | 平均左右平衡           |
| `gap`                                | 调整后配速             |
| `gap_model`                          | GAP 模型               |
| `use_elevation_correction`           | 使用海拔修正           |
| `gear`                               | 装备                   |
| `gear.id`                            | 装备 ID                |
| `gear.name`                          | 装备名称               |
| `gear.distance`                      | 装备里程               |
| `gear.primary`                       | 主装备                 |
| `perceived_exertion`                 | 感知费力程度           |
| `device_name`                        | 设备名称               |
| `power_meter`                        | 功率计                 |
| `power_meter_serial`                 | 功率计序列号           |
| `power_meter_battery`                | 功率计电池             |
| `crank_length`                       | 曲柄长度               |
| `external_id`                        | 外部 ID                |
| `file_sport_index`                   | 文件运动索引           |
| `file_type`                          | 文件类型               |
| `icu_athlete_id`                     | 运动员 ID              |
| `created`                            | 创建时间               |
| `icu_sync_date`                      | 同步日期               |
| `analyzed`                           | 分析时间               |
| `icu_w_prime`                        | W'储备                 |
| `p_max`                              | 最大功率               |
| `threshold_pace`                     | 阈值配速               |
| `icu_hr_zones`                       | 心率区间               |
| `pace_zones`                         | 配速区间               |
| `lthr`                               | 阈值心率               |
| `icu_resting_hr`                     | 静息心率               |
| `icu_weight`                         | 体重                   |
| `icu_power_zones`                    | 功率区间               |
| `icu_sweet_spot_min`                 | 甜点区下限             |
| `icu_sweet_spot_max`                 | 甜点区上限             |
| `icu_power_spike_threshold`          | 功率尖峰阈值           |
| `trimp`                              | 训练冲量               |
| `icu_warmup_time`                    | 热身时间               |
| `icu_cooldown_time`                  | 冷身时间               |
| `icu_chat_id`                        | 聊天 ID                |
| `icu_ignore_hr`                      | 忽略心率               |
| `ignore_velocity`                    | 忽略速度               |
| `ignore_pace`                        | 忽略配速               |
| `ignore_parts`                       | 忽略片段               |
| `ignore_parts.start_index`           | 起始索引               |
| `ignore_parts.end_index`             | 结束索引               |
| `ignore_parts.power`                 | 忽略功率               |
| `ignore_parts.pace`                  | 忽略配速               |
| `ignore_parts.hr`                    | 忽略心率               |
| `icu_training_load_data`             | 训练负荷数据           |
| `interval_summary`                   | 间歇摘要               |
| `skyline_chart_bytes`                | 天际线图表字节         |
| `stream_types`                       | 数据流类型             |
| `has_weather`                        | 有天气数据             |
| `has_segments`                       | 有路段数据             |
| `power_field_names`                  | 功率字段名             |
| `power_field`                        | 功率字段               |
| `icu_zone_times`                     | 区间时间               |
| `icu_zone_times.id`                  | 区间 ID                |
| `icu_zone_times.secs`                | 秒数                   |
| `icu_hr_zone_times`                  | 心率区间时间           |
| `pace_zone_times`                    | 配速区间时间           |
| `gap_zone_times`                     | GAP 区间时间           |
| `use_gap_zone_times`                 | 使用 GAP 区间时间      |
| `custom_zones`                       | 自定义区间             |
| `custom_zones.code`                  | 代码                   |
| `custom_zones.zones`                 | 区间                   |
| `custom_zones.zones.id`              | 区间 ID                |
| `custom_zones.zones.start`           | 起始                   |
| `custom_zones.zones.end`             | 结束                   |
| `custom_zones.zones.start_value`     | 起始值                 |
| `custom_zones.zones.end_value`       | 结束值                 |
| `custom_zones.zones.secs`            | 秒数                   |
| `tiz_order`                          | 区间时间顺序           |
| `polarization_index`                 | 极化指数               |
| `icu_achievements`                   | 成就                   |
| `icu_achievements.id`                | 成就 ID                |
| `icu_achievements.type`              | 成就类型               |
| `icu_achievements.message`           | 成就消息               |
| `icu_achievements.watts`             | 瓦数                   |
| `icu_achievements.secs`              | 秒数                   |
| `icu_achievements.value`             | 数值                   |
| `icu_achievements.distance`          | 距离                   |
| `icu_achievements.pace`              | 配速                   |
| `icu_achievements.point`             | 数据点                 |
| `icu_achievements.point.start_index` | 起始索引               |
| `icu_achievements.point.end_index`   | 结束索引               |
| `icu_achievements.point.secs`        | 秒数                   |
| `icu_achievements.point.value`       | 数值                   |
| `icu_intervals_edited`               | 间歇已编辑             |
| `lock_intervals`                     | 锁定间歇               |
| `icu_lap_count`                      | 圈数                   |
| `icu_joules_above_ftp`               | FTP 以上焦耳           |
| `icu_max_wbal_depletion`             | 最大 W'消耗            |
| `icu_hrr`                            | 心率恢复               |
| `icu_hrr.start_index`                | 起始索引               |
| `icu_hrr.end_index`                  | 结束索引               |
| `icu_hrr.start_time`                 | 起始时间               |
| `icu_hrr.end_time`                   | 结束时间               |
| `icu_hrr.start_bpm`                  | 起始心率               |
| `icu_hrr.end_bpm`                    | 结束心率               |
| `icu_hrr.average_watts`              | 平均功率               |
| `icu_hrr.hrr`                        | 心率恢复值             |
| `icu_sync_error`                     | 同步错误               |
| `icu_color`                          | 颜色                   |
| `icu_power_hr_z2`                    | 功率心率 2 区          |
| `icu_power_hr_z2_mins`               | 功率心率 2 区分钟      |
| `icu_cadence_z2`                     | 2 区踏频               |
| `icu_rpe`                            | 主观费力程度           |
| `feel`                               | 感觉                   |
| `kg_lifted`                          | 举重重量               |
| `decoupling`                         | 解耦率                 |
| `icu_median_time_delta`              | 中位时间差             |
| `p30s_exponent`                      | 30 秒功率指数          |
| `workout_shift_secs`                 | 训练偏移秒数           |
| `strava_id`                          | Strava ID              |
| `lengths`                            | 泳池趟数               |
| `pool_length`                        | 泳池长度               |
| `compliance`                         | 合规度                 |
| `coach_tick`                         | 教练标记               |
| `source`                             | 数据来源               |
| `oauth_client_id`                    | OAuth 客户端 ID        |
| `oauth_client_name`                  | OAuth 客户端名称       |
| `average_altitude`                   | 平均海拔               |
| `min_altitude`                       | 最低海拔               |
| `max_altitude`                       | 最高海拔               |
| `power_load`                         | 功率负荷               |
| `hr_load`                            | 心率负荷               |
| `pace_load`                          | 配速负荷               |
| `hr_load_type`                       | 心率负荷类型           |
| `pace_load_type`                     | 配速负荷类型           |
| `tags`                               | 标签                   |
| `attachments`                        | 附件                   |
| `attachments.id`                     | 附件 ID                |
| `attachments.filename`               | 文件名                 |
| `attachments.mimetype`               | MIME 类型              |
| `attachments.url`                    | URL                    |
| `recording_stops`                    | 记录停止点             |
| `average_weather_temp`               | 平均天气温度           |
| `min_weather_temp`                   | 最低天气温度           |
| `max_weather_temp`                   | 最高天气温度           |
| `average_feels_like`                 | 平均体感温度           |
| `min_feels_like`                     | 最低体感温度           |
| `max_feels_like`                     | 最高体感温度           |
| `average_wind_speed`                 | 平均风速               |
| `average_wind_gust`                  | 平均阵风               |
| `prevailing_wind_deg`                | 主导风向角度           |
| `headwind_percent`                   | 逆风比例               |
| `tailwind_percent`                   | 顺风比例               |
| `average_clouds`                     | 平均云量               |
| `max_rain`                           | 最大降雨               |
| `max_snow`                           | 最大降雪               |
| `carbs_ingested`                     | 摄入碳水               |
| `route_id`                           | 路线 ID                |
| `analysis_issues`                    | 分析问题               |
| `analysis_issues.type`               | 问题类型               |
| `analysis_issues.message`            | 问题消息               |
| `analysis_issues.custom_item_id`     | 自定义项 ID            |
| `pace`                               | 配速                   |
| `athlete_max_hr`                     | 运动员最大心率         |
| `group`                              | 分组                   |
| `icu_intensity`                      | 强度                   |
| `icu_efficiency_factor`              | 效率因子               |
| `icu_power_hr`                       | 功率心率比             |
| `session_rpe`                        | 会话 RPE               |
| `average_stride`                     | 平均步幅               |
| `icu_average_watts`                  | 平均功率               |
| `icu_variability_index`              | 变异性指数             |
| `strain_score`                       | 应变分数               |
