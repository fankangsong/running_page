# 真实数据源接入年度热力图计划

## 1. 摘要 (Summary)
当前 `Heatmap.tsx` 页面使用 `setTimeout` 和 `Math.random()` 模拟生成按天的热力图数据。本计划将参考 `Tracks.tsx` 的实现，接入项目中真实的跑步数据源，以确保热力图展示用户的真实运动记录。

## 2. 现状分析 (Current State Analysis)
- `Tracks.tsx` 通过 `useActivities()` 钩子获取所有活动数据 `activities` 和有数据的年份列表 `years`。
- 活动数据中的单次跑步记录（`Activity` 类型）包含了 `start_date_local`（本地开始时间）和 `distance`（距离，单位为米）。
- 当前 `Heatmap.tsx` 内部硬编码了近 10 年的年份列表，并使用模拟的异步函数 `fetchHeatmapData` 返回格式为 `[{ date: 'YYYY-MM-DD', value: number }]` 的数据。

## 3. 拟议变更 (Proposed Changes)

**目标文件：** `src/pages/Heatmap.tsx`

**具体修改步骤：**
1. **引入真实数据源和工具函数：**
   - 引入 `useActivities` from `@/hooks/useActivities`。
   - 引入 `filterAndSortRuns`, `filterYearRuns`, `sortDateFunc`, `dateKeyForRun` from `@/utils/utils`。

2. **更新年份列表 (`years`)：**
   - 使用 `useActivities` 返回的 `years`（原为字符串数组）映射为数字数组。
   - 确保当前年份 (`currentYear`) 始终包含在列表中，即使当前年尚未有跑步数据。

3. **替换数据处理逻辑：**
   - 移除原有的 `fetchHeatmapData` 模拟函数。
   - 在 `useEffect` 监听 `selectedYear` 时，直接从 `activities` 中过滤出选中年份的数据：
     ```typescript
     const yearRuns = filterAndSortRuns(activities, selectedYear.toString(), filterYearRuns, sortDateFunc);
     ```
   - 遍历过滤后的 `yearRuns`，按天 (`dateKeyForRun`) 对数据进行聚合。由于 `value` 代表单日运动量，这里将当天的所有运动 `distance` 累加并转换为公里（`distance / 1000.0`）。
   - 将聚合后的 Map 转换为 `HeatmapData[]` 数组。

4. **加载态优化：**
   - 真实数据计算在本地非常快，原先模拟的 800ms 延迟可以移除。
   - 为了符合原规格中“避免闪屏”的要求，我们可以利用 React 的状态更新机制直接同步计算并渲染新数据（无延迟即无闪屏），或者保留极短的过渡态（如 `50ms`）让 UI 响应更加柔和。本计划倾向于使用极短的 `setTimeout(..., 50)` 或直接同步更新，提升用户体验并去除冗长无意义的等待。

## 4. 假设与决策 (Assumptions & Decisions)
- **数据指标决策：** 热力图格子的强度 (`value`) 将以单日的 **总跑步距离 (公里)** 作为衡量标准，这与项目其他地方（如 `Tracks.tsx` 和 Tooltip 的 `km` 显示）保持一致。
- **缺失数据处理：** `AnnualHeatmap` 组件内部已经支持对缺失数据的日期渲染为 0（即灰底），因此我们在聚合真实数据时，只需返回有运动记录的日期即可，无需手动补齐全年 365 天。

## 5. 验证步骤 (Verification Steps)
- 切换年份时，检查年份选择器是否正确展示了存在历史数据的年份。
- 确认热力图渲染出的色块分布与真实数据（可通过与 `Tracks.tsx` 页面对比特定年份）一致。
- 鼠标悬停在特定色块上，Tooltip 显示的公里数（km）应等于当天所有跑步记录距离的总和。
- 年份切换操作顺滑，没有数据闪烁或错位。