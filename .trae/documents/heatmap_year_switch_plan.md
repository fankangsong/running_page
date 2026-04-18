# 切换年份时重新播放热力图动画计划

## 1. 摘要 (Summary)
当前在切换年份时，热力图格子会直接更新颜色，并没有重新播放从左向右的波浪点亮动画。本计划旨在通过将 `year` 变量加入到 React 渲染循环的 `key` 属性中，强制 React 在年份切换时重新挂载 (Remount) 格子元素，从而完美触发 CSS 进场动画的重播。

## 2. 现状分析 (Current State Analysis)
- **当前代码**: `d:\code\running_page\src\components\AnnualHeatmap\index.tsx`
- **当前 Key 设计**:
  - 每一列（周）的容器: `key={weekIdx}`
  - 每个格子（天）: `key={`${weekIdx}-${dayIdx}-${isLoading ? 'loading' : 'loaded'}`}`
- **问题原因**: 当用户切换 `year` 时，底层数据的 `weekIdx` 和 `dayIdx` 的组合大多保持不变。React 的 Diff 算法会复用现有的 DOM 节点，仅仅更新它们的 `className`。因为 DOM 节点没有被销毁和重新创建，附着在上面的 CSS 动画（`animation: heatmapFadeIn ... forwards`）就不会再次执行。

## 3. 拟定更改 (Proposed Changes)
修改 `d:\code\running_page\src\components\AnnualHeatmap\index.tsx`，将 `year` 变量注入到遍历渲染时的 `key` 属性中。

**具体修改点**：
1. **修改列容器的 key**:
   - 之前: `<div key={weekIdx} className="flex flex-col gap-1">`
   - 改为: `<div key={`${year}-${weekIdx}`} className="flex flex-col gap-1">`
2. **修改格子的 key**:
   - 之前: `key={`${weekIdx}-${dayIdx}-${isLoading ? 'loading' : 'loaded'}`}`
   - 改为: `key={`${year}-${weekIdx}-${dayIdx}-${isLoading ? 'loading' : 'loaded'}`}`

**原理解释 (Why it works)**：
在 React 中，`key` 是元素的唯一标识。当 `key` 发生改变时（即 `year` 变了），React 会判定这是一个全新的元素，从而将旧年份的 DOM 节点全部卸载 (Unmount)，并挂载 (Mount) 新的 DOM 节点。这个全新的挂载过程会自动触发元素上绑定的 CSS 动画，从而实现切换年份时的重播效果。

## 4. 验证步骤 (Verification Steps)
1. 在页面顶部点击年份选择器，切换到另一个年份。
2. 观察热力图：预期它应该像首次加载时一样，所有的格子被清空后，重新从左向右、从上向下依次播放点亮动画。
3. 多次切换年份，确保每次切换动画都能稳定触发，没有残留的视觉闪烁。