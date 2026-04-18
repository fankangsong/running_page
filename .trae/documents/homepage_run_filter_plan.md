# 首页数据过滤重构计划：仅展示跑步数据

## 1. 摘要 (Summary)
本计划旨在重构 `src/pages/index.tsx` 及其子组件的数据流，确保首页上的所有统计图表（包括 `DashboardStats`、`AnnualHeatmap` 和 `ActivityStats`）**严格只展示跑步（Run）类型**的运动数据，从而解决目前部分组件混合统计了徒步、骑行等非跑步数据的问题。

## 2. 现状分析 (Current State Analysis)
- **`src/pages/index.tsx`**: 当前直接通过 `useActivities()` 获取包含所有运动类型的全量 `activities` 数组。
- **`AnnualHeatmap` (年度热力图)**: 在 `index.tsx` 中计算热力图数据时，仅按年份过滤了全量 `activities`，未过滤运动类型，导致热力图和上方的 `TOTAL RUNS` 包含了非跑步记录。
- **`ActivityStats` (活动趋势统计)**: 接收全量的 `activities` 并在内部按时间范围统计，完全没有 `isRun` 的过滤逻辑，导致其各项指标和图表数据均不纯粹。
- **`DashboardStats` (核心指标汇总)**: 内部独立调用了 `useActivities()`，虽然在累加里程等数据时手动判断了 `isRun(run.type)`，但在展示总次数时直接使用了未过滤的 `runs.length`。

## 3. 拟定修改 (Proposed Changes)

### 3.1 修改 `src/pages/index.tsx` (统一数据源过滤)
- **预过滤数据**: 使用 `useMemo` 基于 `useActivities()` 返回的全量数据，提前过滤出仅包含跑步的数组 `runningActivities`。
- **更新热力图计算**: 在生成 `heatmapData` 的 `useEffect` 中，将数据源从 `activities` 替换为 `runningActivities`，确保热力图及头部的统计数字只包含跑步。
- **向下传递过滤数据**: 
  - 将 `runningActivities` 作为 props 传递给 `<DashboardStats />`。
  - 将 `runningActivities` 作为 props 传递给 `<ActivityStats />`。
- **优化年份选择器**: `years` 数组目前是基于全量活动生成的。新增一个 `runningYears` 逻辑，仅提取存在跑步记录的年份，传递给 `YearSelector`。

### 3.2 修改 `src/components/DashboardStats/index.tsx` (支持外部数据源)
- **新增 Props**: 允许组件接收外部传入的 `runs: Activity[]`。
- **数据源回退**: 如果未传入 `runs`，则回退使用 `useActivities().activities`，保持向下兼容。
- **修复总数 Bug**: 由于现在传入的 `runs` 已经是纯跑步数据，原本展示的 `runs.length` 将正确反映跑步总次数，无需额外修改内部的过滤逻辑（内部保留的 `isRun` 判断作为双重保险也不会出错）。

## 4. 假设与决策 (Assumptions & Decisions)
- **统一在父组件过滤**: 决定在 `index.tsx` 这一层进行统一过滤并向下分发，而不是去修改 `useActivities` hook。这样可以保证其他页面（如 `Tracks` 需要查看所有轨迹，或 `maps.tsx`）依然能获取到全量数据，保持了多运动类型架构的灵活性。
- **热力图总数联动**: 热力图上方的 `TOTAL RUNS` 和 `TOTAL DISTANCE` 是基于传入给热力图组件的 `data` 计算的，一旦 `index.tsx` 中过滤了数据源，这些统计数字会自动修正。

## 5. 验证步骤 (Verification Steps)
1. 打开首页。
2. 检查 `DashboardStats` 模块中的 `TOTAL DISTANCE` 下方的副标题（如 "XXX runs"），确认其数值仅为跑步次数，不再包含徒步/骑行。
3. 检查 `AnnualHeatmap`（年度热力图）上方的 `TOTAL RUNS` 统计，确认其数值与 `DashboardStats` 中的总次数一致（或者为该年份的正确跑步次数）。
4. 检查 `ActivityStats`（活动趋势模块）中的图表和统计（如 `Total Runs`），确认其数据仅反映跑步记录。
5. 检查年份选择器，确认下拉列表中只包含有跑步记录的年份。