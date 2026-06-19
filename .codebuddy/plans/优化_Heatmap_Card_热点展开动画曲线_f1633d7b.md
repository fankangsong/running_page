---
name: 优化 Heatmap Card 热点展开动画曲线
overview: 修正 AnnualHeatmap 从左到右展开动画在后期生硬的问题。根因有二：一是动画完成定时器写死为 600ms，截断了错峰延迟最大约 1070ms+400ms 的完整动画，导致右侧格子被强制弹出；二是缓动曲线使用了强回弹 back-out（cubic-bezier(0.34, 1.56, 0.64, 1)），结尾回弹有硬切感。方案为：修正定时器覆盖完整动画时长，并将曲线改为无回弹的平滑 ease-out-quint。
todos:
  - id: fix-anim-curve-and-timer
    content: 优化 AnnualHeatmap 动画曲线与定时器：替换 back-out 为 easeOutQuart、动态计算完成定时器、收紧错峰延迟
    status: completed
---

## 需求概述

用户反馈 Heatmap Card 从左向右展开热点的动画在后期（右侧格子）显得生硬，要求优化动画曲线。

## 根因分析

经代码排查，"后期生硬"由两个因素叠加造成：

1. **缓动曲线过强**：当前使用 `cubic-bezier(0.34, 1.56, 0.64, 1)`（back-out），y2=1.56 导致 scale 超过 1.0 后回弹，结尾产生 snap 硬切感。
2. **完成定时器截断动画**：定时器写死 600ms，但错峰延迟最大约 1070ms（52周×20ms + 6天×5ms）+ 400ms 时长 = 1470ms。600ms 后 `shouldAnimate` 变 false，`heatmap-cell-anim` 类被移除，右侧约 40% 的格子被强制 snap 到终态，未经历动画过渡。

## 优化目标

- 替换为无回弹的平滑 ease-out 曲线，消除结尾 snap 感。
- 动态计算定时器时长，确保所有格子完成动画后才移除动画类。
- 适度收紧错峰延迟，使整体动画更紧凑流畅。

## 技术栈

- React 18 + TypeScript
- Tailwind CSS（暗色主题）
- CSS `@keyframes` + `animation` 属性实现单元格逐格展开动画
- `cubic-bezier` 缓动函数控制动画曲线

## 修改方案

### 1. 缓动曲线优化（`index.tsx:188`）

将强回弹的 back-out 曲线替换为 easeOutQuart：

- **当前**：`cubic-bezier(0.34, 1.56, 0.64, 1)` — scale 超过 1.0 后回弹，结尾硬切
- **优化后**：`cubic-bezier(0.22, 0.61, 0.36, 1)` — 无回弹，平滑减速到终态，结尾自然收敛

同时将起始 scale 从 0.5 调整为 0.6，减小初始形变幅度，配合新曲线使进入更柔和。

### 2. 定时器动态计算（`index.tsx:43-51`）

提取错峰延迟常量，在 useEffect 中动态计算总动画时长：

```typescript
const WEEK_DELAY = 12;  // ms per week column (原 20)
const DAY_DELAY = 3;    // ms per day row (原 5)
const ANIM_DURATION = 400; // ms, 与 CSS 中 0.4s 一致

// 最大延迟 = (总周数 - 1) * WEEK_DELAY + 6 * DAY_DELAY
// 总时长 = 最大延迟 + ANIM_DURATION + 安全余量
const maxDelay = (weeks.length - 1) * WEEK_DELAY + 6 * DAY_DELAY;
const totalDuration = maxDelay + ANIM_DURATION + 100; // 100ms buffer
```

将 `weeks.length` 加入 useEffect 依赖数组，确保周数变化时重新计算。

### 3. 错峰延迟收紧（`index.tsx:269`）

- **当前**：`weekIdx * 20 + dayIdx * 5` → 最大延迟 ≈ 1070ms，总时长 ≈ 1470ms
- **优化后**：`weekIdx * 12 + dayIdx * 3` → 最大延迟 ≈ 642ms，总时长 ≈ 1042ms

整体动画从 ~1.5s 缩短到 ~1s，右侧格子等待时间减半，视觉上更紧凑流畅。

### 4. 常量提取（DRY）

将 `WEEK_DELAY`、`DAY_DELAY`、`ANIM_DURATION` 提取为组件级常量，在定时器计算和 inline style 中统一引用，避免硬编码分散。

## 实现要点

- **CSS keyframes 起始值**：`scale(0.5)` → `scale(0.6)`，与 easeOutQuart 配合减少弹跳感。
- **定时器安全余量**：+100ms buffer 防止浏览器动画时序抖动导致提前截断。
- **useEffect 依赖**：添加 `weeks.length` 到依赖数组，确保年份数据变化后重新计算时长。
- **无回归风险**：仅修改动画视觉参数，不涉及数据流、交互逻辑或组件结构。