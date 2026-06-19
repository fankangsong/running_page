---
name: activity-stats-year-comparison
overview: 在 ActivityStats 组件的 Year 视图下增加"对比年份"多选功能（最多3个），将柱状图升级为分组柱状图并附带图例，对比数据仅作用于柱状图，不影响顶部指标卡片及其他视图。
todos:
  - id: compare-state-dropdown
    content: 新增 compareYears 状态、availableYears 推导、多选下拉选择器 UI（仅 Year 视图可见，最多 3 个，排除主年份，主年份变化时自动剔除重复）
    status: completed
  - id: compare-chart-data
    content: 实现 comparisonChartData 多系列数据生成（Year 视图+对比年份时遍历全量 activities 按年份月份聚合）及 comparisonMaxValue 计算
    status: completed
    dependencies:
      - compare-state-dropdown
  - id: compare-chart-render
    content: 实现分组柱状图渲染（每月并排多柱+年份颜色调色板+多系列 tooltip）和图例 Legend 展示
    status: completed
    dependencies:
      - compare-chart-data
---

## 产品概述

在 ActivityStats 组件中新增年度对比功能：当柱状图切换到 Year（年度）视图时，用户可选择最多 3 个对比年份，柱状图将以分组柱状图形式并排展示各年份按月份的数据对比，并附带图例标识。

## 核心功能

- **对比年份选择器**：仅在 Year 视图下显示，支持多选（最多 3 个对比年份，不含当前主年份），选择器排除主年份
- **分组柱状图**：Year 视图下若有对比年份，柱状图从单系列切换为分组模式，每个月份内并排显示主年份与对比年份的柱子
- **图例（Legend）**：柱状图区域显示色块+年份标识，主年份标注"current"
- **影响范围限定**：对比年份仅影响柱状图渲染，不影响顶部指标卡片、Aerobic Zones 分布、Location Stats 等其他区域
- **边界处理**：切换主年份时自动剔除重复的对比年份；切换离开 Year 视图时保留对比年份状态但不渲染

## 技术栈

- React 18 + TypeScript（项目现有技术栈）
- Tailwind CSS（暗黑主题样式）
- 所有改动集中在单文件 `src/components/ActivityStats/index.tsx`，无需新增文件

## 实现方案

### 1. 新增状态与可用年份推导

- 新增 `compareYears: number[]` 状态（初始为空数组）
- 新增 `compareDropdownOpen: boolean` 状态控制多选下拉开关
- 从 `activities` prop 中提取所有年份（去重、降序排列），排除当前主年份（`referenceDate.getFullYear()`）作为可选对比年份列表
- 当主年份变化时（prev/next 导航），通过 `useEffect` 自动从 `compareYears` 中剔除与主年份重复的项

### 2. 多选下拉选择器（内联实现）

由于现有 `Dropdown` 组件仅支持单选，在 ActivityStats 内部实现轻量多选下拉：

- 复用 Dropdown 的视觉风格（`bg-card border border-gray-800 rounded-md` 按钮样式 + 下拉面板样式）
- 按钮文案：无选择时显示"Compare Years"，有选择时显示"Compare: 2024, 2023"
- 选项前显示勾选框（选中时 `bg-accent`），点击切换选中态
- 当已达 3 个上限时，未选项置灰禁用
- 点击外部关闭（复用 Dropdown 的 `mousedown` 监听模式）
- 仅在 `timeSpan === 'year'` 时渲染

### 3. 多系列图表数据生成

新增 `comparisonChartData` useMemo：

- 当 `timeSpan === 'year'` 且 `compareYears.length > 0` 时生成多系列数据
- 数据结构：`{ data: { label: string; bars: { year: number; value: number }[] }[]; years: number[] }`
- 年份排序：`[主年份, ...对比年份].sort()`，确保柱子顺序一致
- 对 `activities`（全量数据，非 filteredActivities）按年份+月份聚合，依据当前 `dimension` 计算值
- 计算 `comparisonMaxValue`：取所有年份所有月份的最大值，统一柱高缩放
- 当不满足条件时返回 `null`，柱状图回退到现有单系列渲染逻辑

### 4. 颜色调色板

定义 `YEAR_COLORS` 数组，为最多 4 个年份（1 主 + 3 对比）分配固定渐变色：

- 索引 0（主年份）：`from-[#4fc3f7] to-[#81d4fa]`（复用现有蓝色渐变）
- 索引 1：`from-emerald-400 to-emerald-300`（绿色系）
- 索引 2：`from-orange-400 to-amber-300`（橙黄色系）
- 索引 3：`from-violet-400 to-purple-300`（紫色系）
- 颜色索引按 `comparisonChartData.years` 的排序位置映射，保证主年份始终为蓝色

### 5. 分组柱状图渲染

当 `comparisonChartData` 非空时，替换现有单系列渲染：

- 月份组（month group）：`flex-1 flex flex-col items-center justify-end`，与现有结构一致
- 组内柱子：`flex items-end justify-center gap-0.5`，每个柱子 `flex-1 max-w-[20px]`（缩窄以容纳多柱）
- 柱子样式：复用 `rounded-t origin-bottom transition-[height,transform,filter] duration-500` + 对应年份渐变色
- 悬停效果：`group-hover:scale-y-[1.04] group-hover:opacity-100 group-hover:brightness-110`
- Tooltip：悬停某月份组时，展示该月份所有年份的数值列表（年份+值），便于横向对比
- 图例：柱状图上方居中，显示色块+年份，主年份标注"(current)"

### 6. 图例渲染

- 位置：柱状图上方，`flex items-center justify-center gap-4 flex-wrap`
- 每项：色块（`w-3 h-3 rounded-sm bg-gradient-to-t`）+ 年份文字
- 主年份文字 `text-primary font-bold`，对比年份 `text-secondary`
- 色块渐变与柱子一致

## 性能与实现注意事项

- `comparisonChartData` 依赖 `activities`（全量）而非 `filteredActivities`，需遍历全部活动一次，复杂度 O(n)，与现有 `chartData` 的 All 视图逻辑一致，无性能瓶颈
- 对比年份多选操作不触发 `filteredActivities` 重算（依赖不变），仅影响 `comparisonChartData`
- Tooltip 使用 `group-hover` + `pointer-events-none`，与现有单系列 tooltip 模式一致，无需额外事件处理
- 柱子宽度在分组模式下缩窄至 `max-w-[20px]`，12 个月份组仍可在现有卡片宽度内正常显示
- 移动端适配：柱子间距 `gap-0.5`，图例 `flex-wrap` 自动换行

## 目录结构

所有修改集中在单文件：

```
src/components/ActivityStats/
└── index.tsx  # [MODIFY] 新增对比年份状态、多选下拉、多系列图表数据、分组柱状图渲染、图例
```