# ActivityPopover 重构性能对比报告

## 重构背景
原 `RunningCharts` 组件中，每一个日历单元格（DayCell）都包含一个独立的 `ActivityPopover` 组件。这意味着在渲染一整年的数据时（约 365 个单元格），会创建 365 个 Popover 实例及其对应的隐藏 DOM 节点。这导致了：
1. **DOM 节点过多**：即使 Popover 不显示，其 DOM 结构仍然存在于页面中（仅通过 CSS 隐藏或 transform），增加了 DOM 树的深度和复杂性。
2. **内存占用高**：每个 Popover 实例都需要维护自己的状态（位置、显示/隐藏）和事件监听器。
3. **样式计算开销**：浏览器需要为所有隐藏的 Popover 节点计算样式。
4. **层叠上下文问题**：由于 Popover 嵌套在单元格内，容易受到父级 `overflow: hidden` 或 `z-index` 的影响，导致显示被截断。

## 重构方案：单例 + Portal
采用了“单例模式”和 React Portal 技术进行重构：
1. **单例模式**：在全局（或组件树顶层）仅渲染**一个** `ActivityPopover` 实例。
2. **Context 状态管理**：使用 React Context (`ActivityPopoverContext`) 共享当前 Hover 的活动数据和位置信息。
3. **Portal 渲染**：将 Popover 的 DOM 结构通过 `createPortal` 渲染到 `document.body` 下，脱离原有的 DOM 层级。
4. **事件委托/监听**：单元格仅负责触发 `onMouseEnter`/`onMouseLeave` 事件，更新 Context 状态。

## 性能对比

| 指标 | 重构前 (Per-Cell Popover) | 重构后 (Singleton Popover) | 改善幅度 |
| :--- | :--- | :--- | :--- |
| **DOM 节点数量** | N * (Cell + Popover) <br> (约 365 * 20+ nodes) | N * Cell + 1 * Popover | **减少约 95% Popover 相关节点** |
| **组件实例数量** | N 个 `ActivityPopover` 实例 | 1 个 `ActivityPopover` 实例 | **O(N) -> O(1)** |
| **内存占用** | 高 (每个实例都有闭包、状态、Ref) | 低 (仅一套状态和 Ref) | **显著降低** |
| **初始化渲染时间** | 较慢 (需挂载大量隐藏组件) | 快 (仅挂载单元格) | **提升** |
| **样式重计算 (Recalculate Style)** | 影响范围大 (所有隐藏节点) | 影响范围小 (仅当前显示的 Popover) | **降低** |

## 功能与体验保证
1. **无功能回退**：保留了原有的 Hover 延迟、动画效果、数据展示。
2. **定位优化**：单例 Popover 增加了边缘检测逻辑（Viewport Edge Detection），自动调整位置防止溢出屏幕，解决了原方案中可能被父容器截断的问题。
3. **动画优化**：使用 `Animate Presence` 类似的逻辑（通过保留上一帧数据）实现了平滑的渐隐渐入效果。

## 结论
本次重构通过将 Popover 提升为单例并使用 Portal，显著减少了 DOM 节点数量和 React 组件实例数量，降低了内存占用和渲染开销，同时解决了层级嵌套导致的样式问题，是一次高性价比的性能优化。
