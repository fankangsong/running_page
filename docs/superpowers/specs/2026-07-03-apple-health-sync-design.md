# 苹果健身数据导入功能设计文档

## 概述

为 running_page 项目新增导入苹果健身（Apple Health）导出数据的能力，支持跑步、步行、徒步、骑行四种运动类型，复用现有数据存储和展示架构。

## 背景

### 现有数据流程

```
数据源(Strava/Garmin/GPX) → Generator → data.db → activities.json → UI
```

- `data.db` 包含三张表：`activities`（主活动）、`activity_laps`（圈数据）、`activity_streams`（时序数据流）
- `activities.json` 由 `Generator.load()` 生成，UI 从此文件读取数据
- 增量导入通过 `imported.json` 记录已导入文件列表

### 苹果健身导出数据格式

苹果健身通过"健康自动导出"App 导出两种文件：

**JSON 文件**（`{活动类型}-{开始时间}-{结束时间}.json`）：
- 活动元数据：距离(km)、时长(秒)、心率(max/avg/min)、卡路里(kcal)
- 时序数据：`route[]` 数组包含 GPS 坐标、速度、海拔、时间戳
- 其他数据：步数、心率恢复曲线、湿度等

**GPX 文件**（`{活动类型}-Route-{开始时间}.gpx`）：
- 标准 GPS 轨迹格式
- `<trkpt>` 点包含 lat/lon/ele/time/speed

## 需求确认

| 需求项 | 决策 |
|--------|------|
| 导入模式 | 增量导入，通过 `imported.json` 记录已导入文件 |
| 文件命名 | 格式固定，可用文件名作为唯一标识 |
| 文件配套 | JSON + GPX 总是配套导出，需合并解析 |
| 运动类型 | 跑步、步行、徒步、骑行四种 |
| Laps 数据 | 按公里自动分割生成 |

## 整体架构

```
GPX_OUT/ 目录
    ├─ 活动.json (元数据+时序)
    └─ 活动.gpx (GPS轨迹)
         │
         ▼
apple_health_sync.py (主入口)
    ├─ 扫描目录，匹配 JSON+GPX 文件对
    ├─ 检查 imported.json，跳过已导入
    ├─ 调用 apple_health_parser.py 解析
    ├─ 写入 data.db
    └─ 调用 Generator.load() 导出 activities.json
         │
         ▼
data.db (activities / activity_laps / activity_streams)
         │
         ▼
src/static/activities.json (UI读取)
```

## 数据字段映射

### Activity 表字段

| 苹果 JSON 字段 | Activity 表字段 | 转换说明 |
|---------------|----------------|---------|
| `distance.qty` | `distance` | km → m (乘1000) |
| `duration` | `moving_time`, `elapsed_time` | 秒数直接使用 |
| `heartRate.avg.qty` | `average_heartrate` | bpm |
| `heartRate.max.qty` | `max_heartrate` | bpm |
| `heartRate.min.qty` | - | 存入 streams 最小值 |
| 文件名解析 | `type`, `subtype` | 见类型映射表 |
| 文件名时间 | `start_date`, `start_date_local` | UTC 和本地时间 |
| `totalEnergy.qty` (kJ) | `calories` | 能量（kJ ÷ 4.184 = kcal） |
| GPX 轨迹编码 | `summary_polyline` | 使用现有 polyline_processor |
| `route[]` speed 计算 | `average_speed`, `max_speed` | m/s |
| `route[]` altitude | `elev_high`, `elev_low` | 米 |
| `route[]` altitude 累计爬升 | `elevation_gain` | 米 |
| JSON source 字段 | `device_name` | 如"范康松的Apple Watch" |

### 运动类型映射

```python
APPLE_ACTIVITY_TYPE_MAP = {
    # 跑步类
    "跑步": ("Run", "running"),
    "户外 跑步": ("Run", "running"),
    "室内 跑步": ("Run", "running"),

    # 步行类
    "步行": ("Walk", "walking"),
    "户外 步行": ("Walk", "walking"),
    "室内 步行": ("Walk", "walking"),

    # 徒步
    "徒步": ("Hike", "hiking"),

    # 骑行类
    "骑行": ("Ride", "cycling"),
    "户外 骑行": ("Ride", "cycling"),
    "室内 骑行": ("Ride", "cycling"),
}
```

映射逻辑：文件名前缀 → `(type, subtype)`

### Streams 数据映射

从 JSON `route[]` 数组和心率时序数据提取：

| stream_type | 数据来源 |
|-------------|---------|
| `heartrate` | JSON `heartRateData[]` 或单独心率数组 |
| `velocity_smooth` | `route[].speed` |
| `altitude` | `route[].altitude` |
| `distance` | 从 `route[]` 累计计算 |
| `time` | `route[].timestamp` 转换为相对秒数 |

### Laps 按公里分割

从 `route[]` 时序数据按距离每 1km 切分生成 `ActivityLap` 记录：

- `lap_index`: 递增序号
- `distance`: 1000.0 米（最后一段可能不足）
- `elapsed_time`: 该段时间跨度（秒）
- `moving_time`: 该段时间跨度（秒）
- `average_speed`: 该段平均速度（m/s）
- `average_heartrate`: 该段平均心率
- `start_date`: 该段开始时间

## run_id 生成策略

苹果健身数据无内置唯一 ID，采用文件名哈希生成：

```python
import hashlib

def generate_run_id(filename: str) -> int:
    """根据文件名生成唯一 run_id"""
    hash_str = hashlib.md5(filename.encode()).hexdigest()[:8]
    return int(hash_str, 16)
```

## 文件扫描与匹配逻辑

1. 扫描 `GPX_OUT/` 目录所有 `.json` 文件
2. 解析文件名：`{活动类型}-{开始时间}-{结束时间}.json`
3. 查找对应 GPX：`{活动类型}-Route-{开始时间}.gpx`
   - JSON 时间格式：`2026-06-30_20_24_57`
   - GPX 时间格式：`2026-06-30 20_24_57`（空格代替下划线）
4. 若 GPX 不存在：跳过，打印警告
5. 检查 `imported.json`：已记录则跳过

## 命令行接口

```bash
# 基本用法
python run_page/apple_health_sync.py

# 可选参数
python run_page/apple_health_sync.py --help           # 显示帮助
python run_page/apple_health_sync.py --only-run       # 只导入跑步类型
python run_page/apple_health_sync.py --dir <路径>     # 指定其他目录
python run_page/apple_health_sync.py --force          # 强制重新导入
```

输出示例：
```
扫描 GPX_OUT 目录...
找到 4 个活动文件：
  ✓ 户外 跑步-2026-06-30_20_24_57 (新)
  ✓ 徒步-2025-12-20_13_47_44 (新)
  ✓ 户外 步行-2026-05-24_20_12_36 (已导入，跳过)
  ✓ 户外 骑行-2025-11-16_11_29_45 (新)

正在导入...
  + 户外 跑步 (5.01km, 29:53)
  + 徒步 (39.35km, 4:37:16)
  + 户外 骑行 (5.18km, 44:10)

导出 activities.json...
✅ 完成！新增 3 条活动，跳过 1 条已导入
```

## 错误处理

| 场景 | 处理方式 |
|------|---------|
| JSON 存在但 GPX 缺失 | 警告，跳过 |
| 文件名格式无法解析 | 警告，跳过 |
| JSON 解析失败 | 错误详情，跳过 |
| 运动类型不在映射表 | 警告，跳过 |
| 数据库写入失败 | 错误，回滚，继续下一条 |
| route 数据为空（室内） | 跳过 polyline/streams，保留基础数据 |

## 新增文件结构

```
run_page/
├── apple_health_sync.py      # 主入口脚本（~150行）
├── apple_health_parser.py    # 解析模块（~200行）
├── config.py                 # 现有，复用 GPX_FOLDER
├── generator/__init__.py     # 现有，复用 load()
├── generator/db.py           # 现有，复用数据库操作
├── synced_data_file_logger.py # 现有，复用 imported.json
└── utils.py                  # 现有，复用工具函数
```

**不修改现有文件**，全部复用现有接口。

## 成功标准

1. 执行 `python run_page/apple_health_sync.py` 成功导入 GPX_OUT 下所有活动
2. 数据正确存入 data.db 三张表
3. activities.json 正确生成，UI 可正常展示
4. 再次执行时跳过已导入活动（增量模式生效）
5. 支持 `--only-run` 参数只导入跑步类型