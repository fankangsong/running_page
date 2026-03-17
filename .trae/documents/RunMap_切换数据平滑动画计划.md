## Summary

在首页地图（`src/components/RunMap/index.tsx`）切换月份/日期等导致数据更新时，让地图镜头以平滑动画（非 flyTo，800ms）移动/缩放到新的目标视角；无轨迹数据时动画回到默认视角。

## Current State Analysis

- 地图组件：`src/components/RunMap/index.tsx` 使用 `react-map-gl` 的 `<Map {...viewState} onMove={...} />` 受控渲染；`geoData` 通过 `<Source data={geoData}>` 更新折线图层。
- 状态归属：`viewState` 与 `geoData` 都由首页 `src/pages/index.tsx` 持有；切换年月或选中某天时会 `setGeoData(...)` 并直接 `setViewState(getMapViewState(...))`，导致镜头“瞬移”到新位置。
- `RunMap` 内目前没有在数据/目标视角变化时做任何镜头过渡动画；并且受控 `viewState` 会覆盖 Mapbox 的 `flyTo/easeTo` 这类命令式动画。

## Intent / Success Criteria

- 当 `Index` 因切换年月、日历选择、PB 点击等更新 `viewState`（目标镜头）时：
  - 地图镜头以 flyTo 动画过渡到目标经纬度/缩放（时长 800ms）。
  - 动画过程中允许用户拖拽/缩放打断，并且 state 不出现抖动/回弹。
  - `geoData` 的增量绘制（每 100ms slice）不应导致镜头反复触发动画，仅在目标 `viewState` 变化时触发一次。
- 当目标视角表示“无轨迹数据”（父组件回落到默认 SHENZHEN_VIEW_STATE）时，同样使用动画移动到默认视角。

## Decisions (Locked)

- 动画方式：内部 tween（requestAnimationFrame + easing），不使用 flyTo/easeTo
- 动画时长：800ms
- 无轨迹数据时：动画到默认视角

## Proposed Changes

### 1) 在 RunMap 内部引入“本地受控镜头”，将 props.viewState 视为“目标镜头”

文件：`src/components/RunMap/index.tsx`

- 新增本地状态 `internalViewState`：
  - 初始值取 `props.viewState`（现有父组件计算出的默认视角）。
  - `<Map>` 使用 `internalViewState` 作为受控镜头输入，而不是直接使用 `props.viewState`，避免父组件每次 setViewState 都导致瞬移。
- `onMove` 同步更新：
  - 在用户拖拽/缩放、或程序性动画移动时，`onMove` 会持续回调。
  - 在 `onMove` 中同时 `setInternalViewState(viewState)` 与 `props.setViewState(viewState)`，保持父组件状态与地图真实镜头一致（便于其他逻辑继续使用父组件 viewState）。

### 2) 监听“目标镜头变化”，在 map 实例上触发 flyTo 动画

文件：`src/components/RunMap/index.tsx`

- 通过 `useEffect` 监听 `props.viewState`（目标）变化，并在满足条件时触发动画：
  - 仅在 `mapLoaded === true` 且 `mapRef.current` 可用时执行。
  - 目标必须至少包含 `longitude/latitude/zoom`（缺失则不动画，直接同步 internalViewState）。
- 使用内部 tween 动画（避免命令式 flyTo/easeTo 与受控 viewState 冲突）：
  - `requestAnimationFrame` 驱动，每帧把 `internalViewState` 从当前值插值到目标值（longitude/latitude/zoom）。
  - easing 使用 `easeInOutCubic`（或等价函数），总时长 800ms。
  - 动画期间仅更新 `internalViewState`，不把中间帧回写到父组件；动画结束时一次性 `setViewState(target)`。
- 防止循环与重复触发：
  - 用 `useRef` 保存最近一次已执行动画的目标 key（例如 `lon|lat|zoom` 四舍五入后的字符串）。
  - 若本次目标与已动画目标相同，跳过。
  - 若 internalViewState 已接近目标（阈值 epsilon，例如经纬度差 < 1e-6 且 zoom 差 < 1e-3），跳过。
  - 若用户在动画过程中发生交互拖拽/缩放，立即取消动画并让用户交互接管（同时回写父组件 viewState）。

### 3) 验证与回归点

文件：`src/pages/index.tsx`（不需要改动，但作为回归验证入口）

- 切换月份（CompactRunCalendar 的月份切换）：确认镜头 flyTo 到新月份数据的 bounds。
- 选中某天（locateActivity）：确认镜头 flyTo 到单条/多条轨迹的 bounds；单条轨迹浮层/marker 不受影响。
- “无轨迹数据”的月份：确认镜头 flyTo 回默认 SHENZHEN_VIEW_STATE。
- 用户在动画中拖拽：确认不会被下一次 render 的 props.viewState 拉回/抖动。

## Assumptions & Constraints

- `react-map-gl` 在 Mapbox GL 程序性移动（flyTo）期间会触发 `onMove` 回调，从而驱动受控 `internalViewState` 同步更新。
- `props.setViewState` 目前仅在 `Index` 内作为 Map 受控状态使用，无其他强依赖；将 Map 的受控源切换为内部 state 不会破坏页面逻辑。
- 不引入新的第三方依赖（例如 `FlyToInterpolator`），避免版本/API 不一致风险。

## Verification Steps

- TypeScript/ESLint：确认无新增类型错误（IDE diagnostics）。
- 构建：运行 `pnpm run build` 确认可编译打包。
- 手动验收（浏览器）：
  - 首页切换月份/选择日期/点击 PB，观察镜头以 flyTo 平滑过渡。
  - 动画过程中交互拖拽/缩放，确认可打断且不回弹。
