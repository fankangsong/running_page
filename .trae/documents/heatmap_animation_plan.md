# AnnualHeatmap 动画点亮计划

## 1. 摘要 (Summary)

本计划旨在为 `AnnualHeatmap` 组件添加从左向右（按周）逐步点亮格子的动画效果。当热力图数据加载完成并渲染时，格子不再瞬间全部显示，而是带有一个基于列索引（周数）的延迟动画，从而营造出一种时间流逝、数据逐步积累的动态视觉体验。

## 2. 现状分析 (Current State Analysis)

- **当前实现**: `d:\code\running_page\src\components\AnnualHeatmap\index.tsx`
- **数据结构**: 热力图的格子按照周（列）和星期（行）进行渲染。数据结构为 `weeks[weekIdx][dayIdx]`。
- **渲染逻辑**: 
  ```tsx
  {weeks.map((week, weekIdx) => (
    <div key={weekIdx} className="flex flex-col gap-1">
      {week.map((day, dayIdx) => (
        <div className={`... ${getIntensityClass(day.value)} ...`} />
      ))}
    </div>
  ))}
  ```
- **加载状态**: 组件目前接收 `isLoading` 属性。当 `isLoading` 为 `true` 时，显示骨架屏（灰底 + `animate-pulse`）；当变为 `false` 时，瞬间切换为真实数据颜色。

## 3. 拟定更改 (Proposed Changes)

为了实现“从左向右逐步点亮”的效果，我们需要利用 CSS 的 `animation` 和 `animation-delay` 属性，或者利用 Tailwind 的过渡类配合内联 `style` 来设置延迟。

### 更改点 1：引入动画 Keyframes

我们可以在全局样式（或者通过 Tailwind 的任意值）定义一个简单的淡入并略微缩放的动画，让格子出现时更有质感。或者最简单的方式，利用现有的 Tailwind 过渡，初始状态为全透明，然后逐步变为不透明。

考虑到最简单且优雅的实现：
我们将使用 CSS `animation` 配合 `style={{ animationDelay: '...' }}`。

**具体做法**：
1. 我们将在 Tailwind 中或使用内联样式定义一个 `fade-in-up` 或简单的 `fade-in` 动画。
2. 考虑到项目中使用了 Tailwind，我们可以直接在 `globals.css` 中定义动画，或者在 `tailwind.config.js` 中扩展，但为了避免修改外部配置，我们可以直接在组件内部使用内联样式或者利用 Tailwind 的 `animate-fade-in`（如果已存在）。
3. 更简单的方法：使用 `opacity-0` 和 `animate-[fadeIn_0.5s_ease-out_forwards]`，并在内联样式中动态计算 `animationDelay`。

### 更改点 2：为每个格子应用计算后的延迟

我们需要在渲染每个 `day` 的 `div` 时，添加一个基于 `weekIdx`（列）和 `dayIdx`（行）的延迟时间。

- **主延迟（按周）**：从左向右，`weekIdx * baseDelay`。
- **次延迟（按天，可选）**：让同一周内的格子也有微小的先后顺序，增加灵动感。
- **只在初次加载/数据变化时触发**：由于我们不想在 Hover 时重新触发动画，动画只应在数据渲染时执行一次。

**核心代码修改示例**：

```tsx
// 在渲染格子的 div 上添加：
<div
  className={`w-2.5 h-2.5 rounded-sm transition-colors duration-200 ... 
    ${!isLoading && day.isCurrentYear ? 'opacity-0 animate-[heatmapFadeIn_0.3s_ease-out_forwards]' : ''}
  `}
  style={{
    // 计算延迟：每列增加 20ms，每行增加 5ms，营造左上到右下的波浪感
    animationDelay: !isLoading && day.isCurrentYear ? `${weekIdx * 20 + dayIdx * 5}ms` : '0ms'
  }}
  // ...
/>
```

为了使上述类生效，我们需要在组件内部或者外部定义 `@keyframes heatmapFadeIn`。最干净的做法是在组件顶部或 `globals.css` 注入，或者使用 Tailwind 的 arbitrary variants。

我们可以直接使用内联的 `<style>` 标签在组件内定义这个一次性动画：
```tsx
<style>{`
  @keyframes heatmapFadeIn {
    from { opacity: 0; transform: scale(0.8); }
    to { opacity: 1; transform: scale(1); }
  }
`}</style>
```

### 更改点 3：处理非当前年的透明格子

对于非当前年（即补齐网格的占位格子），它们原本是 `bg-transparent`，我们不需要为它们添加复杂的动画，保持原样即可。

## 4. 假设与决策 (Assumptions & Decisions)

- **决策**: 使用 CSS `@keyframes` 结合内联 `animationDelay`，而不是使用 React 的 `useEffect` 配合状态逐步修改数据。原因：CSS 动画性能极高，不会引起 React 的频繁重绘（re-render），对于 365 个格子的网格来说，CSS 是最优解。
- **决策**: 动画效果不仅仅是颜色的变化，还加入轻微的缩放（`scale(0.8) -> scale(1)`）和淡入（`opacity: 0 -> 1`），让“点亮”的过程看起来像是有生命力的呼吸感。
- **假设**: 动画时间设为 `0.3s`，每列延迟递增 `20ms`，一年 52 周，总动画时长大约为 `0.3s + 52 * 0.02s ≈ 1.34s`，这个时间长度既能看清动画过程，又不会显得拖沓。

## 5. 验证步骤 (Verification Steps)

1. 切换年份时，观察旧数据消失、加载骨架屏出现，随后新数据加载完成。
2. 观察新数据是否从最左侧第一周开始，如波浪般迅速向右侧（年底）依次点亮（淡入并轻微放大）。
3. 验证悬停交互（Tooltip 显示）和点击交互是否在动画完成后正常工作。
4. 验证动画在切换不同年份时能否重复触发。