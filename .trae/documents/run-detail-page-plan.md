---
title: 跑步记录详情页（单条）实施计划
mode: plan
---

## 目标

新增一个“单条跑步记录详情页”，单栏布局，适配手机截图分享：

1. 顶部：1:1 比例地图模块（显示该次跑步轨迹 + 起终点）
2. 底部：该次跑步的详情数据面板（自上而下展示关键指标）

## 现状调研结论（基于现有代码）

- 路由入口在 `src/main.tsx`，当前有 `/`、`/tracks` 和 `*`。
- 首页已有 `RunMap`（支持 1:1 容器 `aspect-square`），以及通过 `run_id` 选择单条跑步并生成 `geoData` 的逻辑。
- 数据源来自 `useActivities()`（静态 `activities.json`），每条记录使用 `Activity.run_id` 作为主键。
- 轨迹与视口相关工具：
  - `geoJsonForRuns([run])`
  - `getBoundsForGeoData(geoData)`
  - `titleForShow(run)`

## 路由与页面设计

### 1) 新增路由

- 新路由：`/run/:runId`
- 页面组件：`src/pages/RunDetail.tsx`
- 保持和现有页面一致：继续通过 `withOptionalGAPageTracking(...)` 包裹 element（和 `/`、`/tracks` 一致）。

### 2) RunDetail 页面布局（单栏 + 适配截图）

- 使用现有 `Layout`，保证 Header/Footer 一致。
- 页面主容器：单栏、居中、手机优先：
  - 外层：`p-4 lg:p-6`
  - 内容最大宽度建议：`max-w-[720px] mx-auto`（手机截图更聚焦）
- 模块顺序：
  1. 地图模块：`w-full aspect-square overflow-hidden rounded-card ...`
  2. 详情面板：`bg-card rounded-card p-6 ...`

## 数据与状态流转

### 1) 从 URL 获取 runId

- 在 `RunDetail.tsx` 使用 `useParams()` 获取 `runId`。
- 转换为 number（`Number(runId)`），并处理非法值：
  - 为空/NaN：渲染 NotFound 或提示“记录不存在”。

### 2) 从 activities 里找到对应 run

- `const { activities } = useActivities();`
- `const run = activities.find(r => r.run_id === runIdNumber);`
- 若未找到：渲染 NotFound 或友好空态。

### 3) 生成地图所需数据

- `const geoData = geoJsonForRuns([run])`
- `const viewState = getBoundsForGeoData(geoData)`（作为初始视口）
- `const title = titleForShow(run)`

## 详情面板（组件化）

新增组件 `src/components/RunDetailPanel/index.tsx`，入参 `run: Activity`，展示字段建议：

- 标题：`run.name` + 日期（`run.start_date_local`）
- 距离：`(run.distance / 1000).toFixed(2) km`
- 用时：使用 `formatRunTime(run.moving_time)`
- 配速：使用 `formatPace(run.average_speed)`（如果有）
- 平均心率：`run.average_heartrate`（若为空显示 `~`）
- 地点：`run.location_country`（若为空显示 `Unknown`）

样式方向：
- 手机下保持一屏可截图：采用 2 列/3 列的 info grid（如 `grid grid-cols-2 gap-3`），长文本 `truncate` + `whitespace-nowrap`。

## 导航入口（可选，但推荐）

为方便从列表进入详情页，提供一个“详情”入口（避免破坏现有单击选中/定位逻辑）：

- 在 `RunTable/RunRow` 的第一列中添加一个小的 `Link` 或图标按钮：
  - `to={\`/run/${run.run_id}\`}`
  - `onClick={(e) => e.stopPropagation()}`，防止触发行的 `locateActivity` 选中逻辑

如果你不需要从表格跳转，只需要可分享链接，则此步骤可以跳过。

## 兼容性与体验细节

- 地图模块必须 1:1：复用首页 `aspect-square` 容器方式。
- 对于没有 `summary_polyline` 的跑步：
  - 地图仍占位 1:1，但显示 `RunMap` 的标题会提示 `(No map data...)`；或在面板中提示“无轨迹数据”。
- 详情页在手机上减少冗余信息，避免出现滚动条导致截图不完整。

## 验证清单

1. 访问 `/#/run/<任意有效 run_id>`：
   - 地图为正方形
   - 轨迹与起终点正常显示
   - 详情面板数据正确
2. 访问 `/#/run/invalid`：
   - 显示 NotFound 或空态
3. 手机尺寸（Chrome DevTools iPhone 13）：
   - 单栏布局不溢出
   - 详情面板不换行/可截屏
4. `pnpm run lint`、`pnpm run build` 通过

