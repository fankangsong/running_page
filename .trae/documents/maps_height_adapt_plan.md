# Maps 页面高度适配计划

## 1. 摘要 (Summary)
本计划旨在解决 `d:\code\running_page\src\pages\maps.tsx` 页面出现页面级别滚动条的问题。目标是让地图组件及其容器精确填满屏幕剩余高度（即视口高度减去 Header 的高度），实现真正的全屏地图沉浸式体验。

## 2. 现状分析 (Current State Analysis)
- **当前代码**: `d:\code\running_page\src\pages\maps.tsx`
- **当前高度设置**: 
  ```tsx
  <div className="relative w-full h-[calc(100vh-64px)] flex overflow-hidden">
  ```
  目前在地图容器上硬编码了 `h-[calc(100vh-64px)]`。
- **页面滚动条的原因**:
  1. `Layout` 组件默认包含一个 `Footer`，而 `Footer` 自身有高度（约 80px）和上外边距（`mt-12`，约 48px）。
  2. `100vh - 64px` 的计算只减去了估算的 Header 高度，但没有减去底部 Footer 的高度。
  3. 当容器高度被强制设为 `100vh - 64px` 时，加上下方的 `Footer`，整个页面的总高度必然超过 `100vh`，从而触发 `<body>` 级别的垂直滚动条。

## 3. 拟定更改 (Proposed Changes)

为了让地图达到真正的全屏沉浸效果（地图直达屏幕底部，没有 Footer 干扰），我们需要对 `Layout` 组件进行小幅增强，允许在特定页面隐藏页脚。

### 更改点 1: 修改 `src/components/Layout/index.tsx`
- **Props 扩展**: 为 `Layout` 增加一个可选属性 `hideFooter?: boolean`。
- **条件渲染**: 在返回的 JSX 中，将 `<Footer />` 修改为条件渲染：
  ```tsx
  {!hideFooter && <Footer />}
  ```

### 更改点 2: 修改 `src/pages/maps.tsx`
- **应用新属性**: 为 `<Layout fullWidth>` 增加 `hideFooter` 属性：
  ```tsx
  <Layout fullWidth hideFooter>
  ```
- **高度自适应调整**: 隐藏了 Footer 后，页面只剩下 Header 和 main 区域。由于当前硬编码的 `h-[calc(100vh-64px)]` 已经完美对应了桌面端 Header 的高度（64px），隐藏 Footer 后就不会再出现溢出。为了更严谨地适配移动端（移动端 Header 包含汉堡菜单，实际高度约为 72px），我们可以将高度调整为 `h-[calc(100vh-72px)] md:h-[calc(100vh-64px)]`，或者使用最简单的 flex 填充方案：
  ```tsx
  <div className="relative w-full flex-grow flex overflow-hidden" style={{ minHeight: 'calc(100vh - 72px)' }}>
  ```
  **但为了最小化修改，我们保留 `h-[calc(100vh-64px)]`，因为问题核心在于 `Footer` 的存在。**
  更新后的外层代码：
  ```tsx
  <Layout fullWidth hideFooter>
    <div className="relative w-full h-[calc(100vh-64px)] md:h-[calc(100vh-72px)] flex overflow-hidden">
      {/* ... */}
    </div>
  </Layout>
  ```

## 4. 假设与决策 (Assumptions & Decisions)
- **决策**: 为地图页面隐藏 `Footer`。地图页面通常需要最大的可视区域来进行平移和缩放操作，底部的 Footer 不仅占用空间，还容易在拖动地图时被误触或引起页面滚动。
- **决策**: 修改 `Layout` 增加 `hideFooter` 参数是最符合 React 组件化思想的解法，不仅解决了当前问题，也为以后可能需要的“全屏沉浸页”提供了支持。

## 5. 验证步骤 (Verification Steps)
1. 访问地图页面 `/maps`。
2. 确认页面底部的 Footer 已经消失。
3. 尝试使用鼠标滚轮上下滚动页面，确认**没有**出现页面级别的垂直滚动条。
4. 确认地图内容（包括左下角的 Mapbox Logo 和右下角的缩放控件）清晰可见，没有被屏幕底部裁剪。