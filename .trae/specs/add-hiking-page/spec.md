# Add Hiking Page Spec

## Why
当前项目中的地图页面 (`maps.tsx`) 和首页主要聚焦于展示跑步（Run）数据。由于用户同样拥有徒步（Hike）和步行（Walk）等数据，我们需要一个专属的页面来在地图上可视化这些活动轨迹。该页面将复用现有地图页面的成熟设计，但展示的数据和交互会更纯粹地服务于徒步场景。

## What Changes
- **新增页面**：创建 `src/pages/hiking.tsx` 页面。
- **布局复用**：复刻 `maps.tsx` 的全屏地图和悬浮侧边栏布局。
- **数据过滤**：仅筛选出 `Activity` 中 `type` 为 `Hike` 或 `Walk` 的数据。
- **交互简化**：
  - 侧边栏列表默认展示所有徒步/步行数据。
  - **移除** 侧边栏中的年份/月份下拉筛选器及前后月切换按钮。
- **UI 定制**：
  - 将侧边栏标题改为 "HIKE & WALK"。
  - 更换图标为徒步相关的视觉元素。
  - 使用与徒步主题相符的渐变色（如翡翠绿 `emerald`）。
- **路由与导航**：
  - 在 `src/main.tsx` 中注册 `/hiking` 路由。
  - 在 `src/static/site-metadata.ts` 中添加 "Hiking" 到顶部导航栏。

## Impact
- Affected specs: 无直接影响。
- Affected code:
  - `src/main.tsx` (路由)
  - `src/static/site-metadata.ts` (导航)
  - `src/components/RunListSidebar/index.tsx` (支持无过滤模式)
  - `src/pages/hiking.tsx` (新建文件)

## ADDED Requirements
### Requirement: New Hiking Page
The system SHALL provide a dedicated full-screen map page for visualizing hiking and walking activities.

#### Scenario: Success case
- **WHEN** user navigates to `/hiking`
- **THEN** the system displays a Mapbox map with all hiking and walking tracks plotted.
- **AND** a sidebar displays a scrollable list of all these activities without month/year dropdown filters.
- **AND** clicking an item in the sidebar flies the map to that specific track.