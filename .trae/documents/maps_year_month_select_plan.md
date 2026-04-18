# Maps 页面年份、月份选择逻辑及样式优化计划

## 1. 摘要 (Summary)
本计划旨在优化 `d:\code\running_page\src\pages\maps.tsx` 及其侧边栏组件 `RunListSidebar` 中的年份和月份选择逻辑与样式。目标是：
1. 限制月份和年份的选择范围，只允许选择有跑步数据的年份和月份。
2. 改进下拉选择器的 UI 样式，引入项目现有的 `Dropdown` 组件，替代原生 `<select>`，提升整体视觉一致性和用户体验。

## 2. 现状分析 (Current State Analysis)
- **当前逻辑**: 
  - 年份下拉框显示了 `years` 数组（所有有数据的年份）。
  - 月份切换仅通过左右箭头 `<` 和 `>` 进行，简单地执行 `month + 1` 或 `month - 1`，跨年时自动切换年份。这种逻辑**没有检查目标年月是否真的有数据**，可能导致用户切换到一个完全没有跑步记录的空白月份。
- **当前样式**: 
  - 使用了原生 `<select>` 标签，配合 `appearance-none` 隐藏了原生箭头，样式比较简陋。
  - 月份显示为纯文本，不支持直接下拉选择。

## 3. 拟定更改 (Proposed Changes)

### 更改点 1: 在 `maps.tsx` 中计算有数据的年份和月份映射
我们需要根据全量 `activities` 数据，预先计算出一个数据结构，记录每个年份下有哪些月份有数据。

**数据结构**: `Record<string, number[]>` (例如：`{ '2023': [10, 11, 12], '2024': [1, 2] }`)

**在 `maps.tsx` 中**:
1. 引入 `isRun` 函数。
2. 使用 `useMemo` 遍历 `activities`，过滤出 `isRun(activity.type)` 的记录，提取所有 `start_date_local` 中的年份和月份。
3. 构建 `availableYearMonths` 映射表，并对每个年份下的月份进行降序排序（如 `[12, 11, 10]`）。
4. 扁平化为一个有序的可用年月列表 `availableYearMonthList: {year: string, month: number}[]`，按时间降序排列，方便左右箭头快速查找上一个/下一个有数据的月份。
5. 将这些计算结果作为 props 传递给 `RunListSidebar`。
6. 更新初始状态的逻辑：使用 `availableYearMonthList[0]`（即所有记录中最新的一条）作为初始的 `year` 和 `month`，如果列表为空则回退到当前时间和年份。

### 更改点 2: 改造 `RunListSidebar` 的切换逻辑
**接收新的 Props**: 
- `availableYearMonths: Record<string, number[]>`
- `availableYearMonthList: {year: string, month: number}[]`

**年份与月份选择逻辑**:
- 当用户通过 `Dropdown` 切换年份时，自动选择该年份下**最新（最大）的一个有数据的月份**，触发 `onChangeYearMonth(newYear, availableYearMonths[newYear][0])`。
- 当用户通过 `Dropdown` 切换月份时，触发 `onChangeYearMonth(year, newMonth)`。

**左右箭头切换逻辑重写**:
- 找到当前 `{year, month}` 在 `availableYearMonthList` 中的索引。
- 点击“上一个”(Prev) 箭头时，如果不在最顶端 (index > 0)，跳转到 `index - 1`（更新的月份）。
- 点击“下一个”(Next) 箭头时，如果不在最底端 (index < list.length - 1)，跳转到 `index + 1`（更旧的月份）。
- 如果已经是第一项或最后一项，则禁用相应的箭头按钮。

### 更改点 3: 优化下拉选择样式 (使用 `Dropdown` 组件)
1. 引入 `src/components/Dropdown/index.tsx`。
2. 移除原生的 `<select>` 标签和纯文本月份显示。
3. **UI 布局调整**: 
   在侧边栏 Header 中，将年份和月份选择器并排排列。使用 Flex 布局（`flex gap-2 w-full`）和 `flex-1` 类名覆盖 Dropdown 默认的 `w-32`，让两个选择器平分空间，保持样式统一。

## 4. 假设与决策 (Assumptions & Decisions)
- **Dropdown 适配**: `Dropdown` 组件期望的 `options` 格式是 `{ label: string, value: string | number }[]`。
  - 年份 Options: `Object.keys(availableYearMonths).sort((a,b)=>Number(b)-Number(a)).map(y => ({ label: y, value: y }))`。
  - 月份 Options: `availableYearMonths[year]?.map(m => ({ label: monthNames[m - 1], value: m })) || []`。
- **箭头排序定义**: 
  - “Next (右箭头)” 代表时间倒流（往更旧的月份走，符合列表默认按时间降序的习惯）。
  - “Prev (左箭头)” 代表时间顺流（往更新的月份走）。
- **可用数据判定**: 生成 `availableYearMonths` 时，只考虑 `isRun(activity.type)` 为 true 的记录。

## 5. 验证步骤 (Verification Steps)
1. 打开地图页面，观察侧边栏 Header，应看到两个使用了 `Dropdown` 样式的下拉框（年份和月份），平分宽度。
2. 展开月份下拉框，验证里面**只有**该年份有跑步记录的月份。
3. 点击年份下拉框选择一个不同的年份，观察月份是否自动跳至该年份有数据的最新月份。
4. 点击左右箭头，验证能否在所有有数据的 `[year, month]` 组合中正确跳跃，跳过没有数据的空白月份。
5. 验证当到达最老或最新的记录时，相应的箭头按钮被禁用（透明度降低，不可点击）。