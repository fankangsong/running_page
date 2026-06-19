---
name: merge-compare-button-with-title
overview: 将 Compare Years 多选下拉按钮从顶部控件行独立元素，移入 Navigation & Title 区块中紧邻年份标题，使其与年份导航在视觉上合并为一组；其余逻辑（仅 Year 视图显示、多选、面板渲染）保持不变。
todos:
  - id: move-compare-dropdown
    content: 将 Compare Years 选择器块从 Dimension Select 后移至 Navigation & Title 容器内 next 按钮之后
    status: completed
---

## 需求概述

将 `ActivityStats` 组件中独立的 "Compare Years" 多选下拉按钮移动到年份导航标题组（prev/next 按钮 + 年份标题）内部，使三者视觉上合并为同一组控件。

## 核心功能

- 将 Compare Years 选择器从顶部控件行的独立位置移入 Navigation & Title 区块
- prev/next 按钮 + 年份标题 + Compare Years 按钮在同一个 `flex items-center gap-3` 容器内并排显示
- 仅在 Year 视图下显示 Compare Years 按钮（条件渲染不变）
- 所有交互逻辑、状态管理、下拉面板行为保持不变

## 技术栈

- React 18 + TypeScript（项目现有技术栈）
- Tailwind CSS（暗黑主题样式）
- 所有改动集中在单文件 `src/components/ActivityStats/index.tsx`

## 实现方案

### 当前结构

顶部控件行（`flex flex-col sm:flex-row justify-between`）内含四个子块：

1. **Tabs** — 时间跨度选择按钮组（Week/Month/Year/All）
2. **Navigation & Title** — `flex items-center gap-3` 容器，包含 prev 按钮 + 年份标题 span + next 按钮
3. **Dimension Select** — Dropdown 组件
4. **Compare Years Select** — `timeSpan === 'year'` 条件渲染的多选下拉

### 改动步骤

1. **移除**：将 Compare Years Select 整块（行 536-624，从 `{timeSpan === 'year' && (` 到对应的 `)}` 及外层 `<div ref={compareDropdownRef}>`）从 Dimension Select 之后移除。

2. **插入**：将整块插入到 Navigation & Title 的 `flex items-center gap-3` 容器内部，紧接 next 按钮（`</button>`）之后、容器闭合 `</div>` 之前。

3. **样式微调**：Compare Years 按钮的 `w-40` 宽度在 `gap-3` 组内保持不变，不影响布局。年份标题 span 的 `min-w-[120px]` 在 Year 视图下会与 Compare Years 按钮自然间隔。

### 性能与注意事项

- 纯 JSX 结构调整，无逻辑/状态变更，无性能影响
- `compareDropdownRef` 引用保持不变，点击外部关闭逻辑不受影响
- 下拉面板的 `absolute right-0` 定位在新父容器内仍正确锚定