# Tasks

- [x] Task 1: 扩展侧边栏组件以支持无过滤模式
  - [x] 修改 `src/components/RunListSidebar/index.tsx`，增加可选属性 `showFilter?: boolean`（默认为 true）。
  - [x] 修改 `src/components/RunListSidebar/index.tsx`，增加可选属性 `title?: string`（默认为 'RUNS'）。
  - [x] 当 `showFilter` 为 false 时，不渲染年月下拉框（Dropdown）和左右切换按钮。
  - [x] 确保在无过滤模式下，列表项的日期显示格式包含年份（例如 `Dec 15, 2023`），因为不再按月过滤。

- [x] Task 2: 创建徒步地图页面 (`hiking.tsx`)
  - [x] 在 `src/pages/` 下创建 `hiking.tsx` 文件。
  - [x] 复制 `maps.tsx` 的基本结构和引入依赖。
  - [x] 使用 `useActivities` 获取数据，并使用 `HIKE_TYPE` 和 `WALK_TYPE` 过滤出徒步和步行的记录，并按日期排序。
  - [x] 移除原来 `maps.tsx` 中的年月过滤状态（`year`, `month`, `availableYearMonths` 等）。
  - [x] 使用过滤后的所有徒步/步行数据作为 `geoData` 的来源，并初始化地图的 `viewState`。
  - [x] 引入并使用修改后的 `RunListSidebar` 组件：传入所有徒步/步行数据，设置 `showFilter={false}`，并修改 `title` 为 "HIKE & WALK"。

- [x] Task 3: 配置路由与导航
  - [x] 在 `src/main.tsx` 中导入新创建的 `Hiking` 页面组件。
  - [x] 在 `src/main.tsx` 的 `routes` 配置中，添加 `{ path: '/hiking', element: withOptionalGAPageTracking(<Hiking />) }`。
  - [x] 修改 `src/static/site-metadata.ts`，在 `navLinks` 数组中添加一个对象 `{ name: 'Hiking', url: '/hiking' }`，使其出现在顶部导航栏中。