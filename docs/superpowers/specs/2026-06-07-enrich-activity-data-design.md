# 跑步数据丰富化设计文档

> 创建日期：2026-06-07
> 状态：待用户审核

## 概述

基于 Strava API 文档 (`docs/api/api-refs.md`)，丰富现有 `data.db` 数据库和前端展示，实现：
1. 扩展活动基础字段（最大心率、步频、卡路里等）
2. 支持每公里指标分解展示
3. 支持心率曲线和配速曲线展示

## 一、数据库架构扩展

### 1.1 新增字段到 `activities` 表

| 字段 | 类型 | 来源 API | 用途 |
|------|------|----------|------|
| `elapsed_time` | Interval | activity 详情 | 总耗时（含暂停） |
| `max_heartrate` | Float | activity 详情 | 最大心率 |
| `max_speed` | Float | activity 详情 | 最大速度（米/秒） |
| `average_cadence` | Float | activity 详情 | 平均步频（步/分钟） |
| `calories` | Float | activity 详情 | 卡路里消耗 |
| `device_name` | String | activity 详情 | 设备名称 |
| `elev_high` | Float | activity 详情 | 最高海拔（米） |
| `elev_low` | Float | activity 详情 | 最低海拔（米） |

### 1.2 新增 `activity_laps` 表

用于存储每公里（或每圈）分解数据。

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | Integer | 主键（自增） |
| `activity_id` | Integer | 外键，关联 activities.run_id |
| `lap_index` | Integer | 圈序号（第几公里/圈） |
| `distance` | Float | 该圈距离（米） |
| `elapsed_time` | Integer | 该圈总耗时（秒） |
| `moving_time` | Integer | 该圈移动时间（秒） |
| `average_speed` | Float | 该圈平均速度（米/秒） |
| `average_heartrate` | Float | 该圈平均心率（bpm） |
| `total_elevation_gain` | Float | 该圈爬升（米） |
| `start_date` | String | 该圈开始时间 |

### 1.3 新增 `activity_streams` 表

用于存储时序曲线数据（心率、配速、海拔等）。

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | Integer | 主键（自增） |
| `activity_id` | Integer | 外键，关联 activities.run_id |
| `stream_type` | String | 数据类型：heartrate/velocity_smooth/altitude/distance/time |
| `data` | String | JSON 数组格式存储数据点序列 |

**Streams 类型说明：**
- `heartrate`: 心率序列（bpm）
- `velocity_smooth`: 平滑速度序列（米/秒）
- `altitude`: 海拔序列（米）
- `distance`: 累计距离序列（米）
- `time`: 时间戳序列（秒）

## 二、Python 后端同步逻辑

### 2.1 修改 `run_page/generator/db.py`

**改动内容：**

1. 扩展 `Activity` 模型类，添加新字段
2. 新增 `ActivityLap` 模型类
3. 新增 `ActivityStream` 模型类
4. 更新 `ACTIVITY_KEYS` 列表包含新字段名
5. 新增 `update_or_create_lap(session, activity_id, lap_data)` 函数
6. 新增 `update_or_create_stream(session, activity_id, stream_type, stream_data)` 函数
7. 修改 `to_dict()` 方法，输出关联的 laps 和 streams

### 2.2 修改 `run_page/generator/__init__.py`

**改动内容：**

1. 新增 `sync_activity_details(activity_id)` 方法
   - 调用 `/activities/{id}` 获取完整详情
   - 更新 max_heartrate, max_speed, calories 等字段

2. 新增 `sync_activity_laps(activity_id)` 方法
   - 调用 `/activities/{id}/laps` API
   - 存入 activity_laps 表

3. 新增 `sync_activity_streams(activity_id)` 方法
   - 调用 `/activities/{id}/streams?keys=heartrate,velocity_smooth,altitude,distance,time`
   - 存入 activity_streams 表

4. 修改现有 `sync()` 方法，在同步每个活动后调用上述方法

5. 添加速率限制处理逻辑
   - 检测 `RateLimitExceeded` 异常
   - 自动等待 `timeout` 秒后重试
   - 添加日志记录

### 2.3 API 调用策略

```python
# 同步流程
for activity in client.get_activities(**filters):
    # 1. 基础同步（现有逻辑）
    update_or_create_activity(session, activity)
    
    # 2. 获取完整详情（补充字段）
    if need_details:
        detailed_activity = client.get_activity(activity.id)
        update_activity_details(session, detailed_activity)
    
    # 3. 同步 laps
    try:
        laps = client.get_activity_laps(activity.id)
        for lap in laps:
            update_or_create_lap(session, activity.id, lap)
    except RateLimitExceeded as e:
        wait_and_retry(e.timeout)
    
    # 4. 同步 streams
    try:
        streams = client.get_activity_streams(
            activity.id, 
            keys=['heartrate', 'velocity_smooth', 'altitude', 'distance', 'time']
        )
        for stream_type, data in streams.items():
            update_or_create_stream(session, activity.id, stream_type, data)
    except RateLimitExceeded as e:
        wait_and_retry(e.timeout)
```

### 2.4 JSON 导出格式

修改 `load()` 方法输出格式：

```json
{
  "run_id": 123456,
  "name": "Morning Run",
  "distance": 10000,
  ...
  "max_heartrate": 185,
  "max_speed": 4.5,
  "average_cadence": 180,
  "calories": 650,
  "device_name": "Garmin Forerunner 245",
  "elev_high": 150,
  "elev_low": 80,
  "laps": [
    {
      "lap_index": 1,
      "distance": 1000,
      "elapsed_time": 330,
      "moving_time": 325,
      "average_speed": 3.08,
      "average_heartrate": 145
    },
    ...
  ],
  "streams": {
    "heartrate": [120, 125, 130, ...],
    "velocity_smooth": [2.8, 3.0, 3.2, ...],
    "altitude": [80, 82, 85, ...],
    "distance": [0, 10, 20, ...],
    "time": [0, 1, 2, ...]
  }
}
```

## 三、前端数据层

### 3.1 TypeScript 接口定义 (`src/utils/utils.ts`)

```typescript
// 扩展 Activity 接口
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

// Lap 接口
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

// Streams 接口
export interface ActivityStreams {
  heartrate?: number[];
  velocity_smooth?: number[];
  altitude?: number[];
  distance?: number[];
  time?: number[];
}
```

### 3.2 新增工具函数

```typescript
// 格式化步频
export const formatCadence = (cadence: number): string => {
  if (!Number.isFinite(cadence)) return '--';
  return `${Math.round(cadence)} spm`;
};

// 格式化卡路里
export const formatCalories = (calories: number): string => {
  if (!Number.isFinite(calories)) return '--';
  return `${Math.round(calories)} kcal`;
};

// 格式化海拔
export const formatElevation = (meters: number): string => {
  if (!Number.isFinite(meters)) return '--';
  return `${Math.round(meters)} m`;
};

// 从速度计算配速（分钟/公里）
export const paceFromSpeed = (speed: number): number => {
  if (speed <= 0 || !Number.isFinite(speed)) return Infinity;
  return (1000 / speed) / 60;
};

// 从 streams 计算每公里分段（备用方案）
export const computeKmSplitsFromStreams = (
  streams: ActivityStreams,
  totalDistance: number
): Lap[] => {
  if (!streams.distance || !streams.velocity_smooth) return [];
  
  const kmCount = Math.ceil(totalDistance / 1000);
  const splits: Lap[] = [];
  
  for (let km = 1; km <= kmCount; km++) {
    const targetDist = km * 1000;
    // 找到对应距离索引
    const idx = streams.distance.findIndex(d => d >= targetDist);
    if (idx >= 0) {
      // 计算该公里段的平均速度和心率
      const prevIdx = km === 1 ? 0 : streams.distance.findIndex(d => d >= (km - 1) * 1000);
      const segmentSpeed = streams.velocity_smooth.slice(prevIdx, idx);
      const avgSpeed = segmentSpeed.reduce((a, b) => a + b, 0) / segmentSpeed.length;
      
      splits.push({
        lap_index: km,
        distance: 1000,
        average_speed: avgSpeed,
        elapsed_time: idx > prevIdx ? (streams.time?.[idx] - streams.time?.[prevIdx]) || 0 : 0,
        average_heartrate: streams.heartrate 
          ? streams.heartrate.slice(prevIdx, idx).reduce((a, b) => a + b, 0) / (idx - prevIdx)
          : undefined
      });
    }
  }
  
  return splits;
};
```

## 四、UI 组件设计

### 4.1 扩展 `RunDetailPanel` 组件

**新增基础指标行：**

位于现有指标网格下方，新增一行展示：
- 最大心率（max_heartrate）
- 平均步频（average_cadence）
- 卡路里（calories）
- 海拔变化（elev_high - elev_low）

**新增曲线图区域：**

位于心率区间条下方，展示：
- 心率曲线图
- 配速曲线图
- 海拔剖面图（可选）

**新增每公里表格：**

位于曲线图下方，展示公里分解数据。

### 4.2 `ActivityCurves` 组件

**Props 定义：**
```tsx
interface ActivityCurvesProps {
  streams?: ActivityStreams;
  totalDistance: number;
  className?: string;
}
```

**功能设计：**
1. 支持三种曲线类型切换：心率、配速、海拔
2. X 轴根据类型显示：时间（秒）或距离（公里）
3. Y 轴显示对应数值
4. 悬停显示 tooltip（数值、时间点、距离点）
5. 数据缺失时显示空状态提示

**配色方案：**
- 心率曲线：`stroke-orange-400`，渐变 `from-orange-500`
- 配速曲线：`stroke-blue-400`，渐变 `from-blue-500`
- 海拔剖面：`stroke-emerald-400`，渐变 `from-emerald-500`

**SVG 实现要点：**
- 使用 `<path>` 绘制平滑曲线
- 添加网格线和刻度标签
- tooltip 使用绝对定位的 div

### 4.3 `KmSplitsTable` 组件

**Props 定义：**
```tsx
interface KmSplitsTableProps {
  laps?: Lap[];
  streams?: ActivityStreams;
  totalDistance: number;
}
```

**表格列设计：**

| 列 | 内容 | 格式 |
|----|------|------|
| 公里 | lap_index | "1", "2", ... |
| 配速 | average_speed → pace | "5'30"" |
| 时间 | elapsed_time 累计 | "5:30" |
| 心率 | average_heartrate | "145 bpm" 或 "--" |
| 海拔 | elevation_change | "+5m" 或 "--" |

**样式设计：**
- 表头：`text-secondary uppercase tracking-wider text-xs`
- 数据行：`text-primary font-condensed`
- 最快公里行：`bg-accent/20 ring-1 ring-accent/50`
- 悬停效果：`hover:bg-gray-800/30`

### 4.4 UI 布局示意图

```
RunDetailPanel 结构：

┌─────────────────────────────────────┐
│ 活动名称（渐变标题）                   │
│ 日期时间                              │
├─────────────────────────────────────┤
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐     │
│ │距离 │ │配速 │ │时间 │ │心率 │     │  ← 现有指标
│ │KM   │ │/KM  │ │min  │ │BPM  │     │
│ └─────┘ └─────┘ └─────┘ └─────┘     │
├─────────────────────────────────────┤
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐     │
│ │最大 │ │步频 │ │热量 │ │海拔 │     │  ← 新增扩展指标
│ │心率 │ │spm  │ │kcal │ │gain │     │
│ └─────┘ └─────┘ └─────┘ └─────┘     │
│                                     │
│ [心率区间条 - Z1-Z5]                 │  ← 现有
├─────────────────────────────────────┤
│ [ActivityCurves - 曲线图切换]        │  ← 新增
│ ┌───────────────────────────────┐   │
│ │ 📈 心率/配速/海拔 曲线          │   │
│ │    (SVG 绘制)                  │   │
│ └───────────────────────────────┘   │
├─────────────────────────────────────┤
│ [KmSplitsTable - 每公里表格]         │  ← 新增
│ ┌─────┬──────┬──────┬──────┬─────┐  │
│ │KM   │配速  │时间  │心率  │海拔 │  │
│ ├─────┼──────┼──────┼──────┼─────┤  │
│ │ 1   │5'30" │5:30  │145   │+5m  │  │
│ │ 2*  │5'20" │10:50 │152   │+3m  │  │  ← 最快公里高亮
│ │ ... │...   │...   │...   │...  │  │
│ └─────┴──────┴──────┴──────┴─────┘  │
├─────────────────────────────────────┤
│ [月度热力图 - 现有]                  │
│ [月度统计卡片 - 现有]                │
└─────────────────────────────────────┘
```

## 五、错误处理与边界情况

### 5.1 数据缺失处理

| 场景 | 处理方式 |
|------|----------|
| 无心率数据（average_heartrate=null） | 显示 `--`，隐藏心率相关组件 |
| 无步频数据 | 不显示步频指标单元格 |
| 无 laps 和 streams | 隐藏曲线图和表格，显示 "暂无详细数据" |
| 部分 km 心率缺失 | 表格中显示 `--` |
| 设备名称为空 | 不显示设备信息 |

### 5.2 API 同步错误处理

| 场景 | 处理方式 |
|------|----------|
| Strava 速率限制 | 等待 timeout 秒后重试，记录日志 |
| 单个活动 streams 失败 | 跳过该活动 streams，继续同步其他 |
| Laps API 返回空数组 | 正常存储，显示空表格提示 |
| 网络连接中断 | 重试 3 次，失败后终止并提示用户 |
| JSON 导出失败 | 回滚数据库事务，记录错误日志 |

### 5.3 数据量大时的性能考虑

| 场景 | 处理方式 |
|------|----------|
| streams 数据过长（>10000点） | 前端按比例采样显示，不全量渲染 |
| 大量活动同步 | 添加进度指示，支持断点续传 |
| JSON 文件过大 | 保持现有架构，数据库查询而非全量加载 |

## 六、实施计划

### 6.1 Phase 1: 后端数据层

**文件改动：**
- `run_page/generator/db.py` - 扩展数据模型
- `run_page/generator/__init__.py` - 修改同步逻辑

**任务清单：**
1. 在 db.py 中新增 Activity 字段定义
2. 创建 ActivityLap 和 ActivityStream 模型类
3. 实现 update_or_create_lap 函数
4. 实现 update_or_create_stream 函数
5. 修改 ACTIVITY_KEYS 和 to_dict() 方法
6. 在 generator 中新增 sync_activity_laps 方法
7. 在 generator 中新增 sync_activity_streams 方法
8. 修改 sync() 方法调用新增方法
9. 测试数据同步流程

### 6.2 Phase 2: 前端数据层

**文件改动：**
- `src/utils/utils.ts` - 扩展接口定义

**任务清单：**
1. 扩展 Activity 接口类型
2. 新增 Lap 接口类型
3. 新增 ActivityStreams 接口类型
4. 新增 formatCadence 等格式化函数
5. 新增 computeKmSplitsFromStreams 函数
6. 验证数据加载和类型检查

### 6.3 Phase 3: UI 组件开发

**文件改动：**
- `src/components/RunDetailPanel/index.tsx` - 扩展组件
- `src/components/ActivityCurves/index.tsx` - 新建组件
- `src/components/KmSplitsTable/index.tsx` - 新建组件

**任务清单：**
1. 扩展 RunDetailPanel，新增基础指标行
2. 创建 ActivityCurves SVG 曲线组件
3. 创建 KmSplitsTable 表格组件
4. 集成到 RunDetail 页面
5. 样式调整确保符合设计规范

### 6.4 Phase 4: 测试与优化

**任务清单：**
1. 使用真实 Strava 数据测试同步
2. 验证各边界情况处理
3. 检查大数据量性能
4. 样式细节打磨
5. 更新 CLAUDE.md 文档

## 七、预估工作量

| 部分 | 预估时间 |
|------|----------|
| Phase 1: 后端数据层 | 2-3 小时 |
| Phase 2: 前端数据层 | 1 小时 |
| Phase 3: UI 组件开发 | 4-5 小时 |
| Phase 4: 测试与优化 | 2 小时 |
| **总计** | **约 9-11 小时** |

## 八、关键文件清单

**后端文件：**
- `run_page/generator/db.py`
- `run_page/generator/__init__.py`
- `run_page/strava_sync.py`（可能需要调整参数）

**前端文件：**
- `src/utils/utils.ts`
- `src/components/RunDetailPanel/index.tsx`
- `src/components/ActivityCurves/index.tsx`（新建）
- `src/components/KmSplitsTable/index.tsx`（新建）
- `src/pages/RunDetail.tsx`

**数据文件：**
- `run_page/data.db`
- `src/static/activities.json`

---

> **下一步：** 用户审核本设计文档后，调用 `superpowers:writing-plans` skill 生成详细实施计划。