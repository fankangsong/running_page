# Maps 页面侧边栏重构计划

## 1. 摘要 (Summary)
本计划旨在将 `d:\code\running_page\src\pages\maps.tsx` 中的侧边栏模块由原本的“紧凑型日历 (CompactRunCalendar)”重构为一个“可折叠的跑步列表 (RunList)”。新列表将按月分页展示数据，列表项包含跑步标题和公里数。同时，侧边栏需要支持折叠/展开交互，以提供更好的地图视野。

## 2. 现状分析 (Current State Analysis)
- **当前代码**: `d:\code\running_page\src\pages\maps.tsx`
- **当前侧边栏实现**: 
  - 侧边栏位于地图右侧，内部渲染了 `<CompactRunCalendar />` 组件。
  - `maps.tsx` 中维护了 `year`, `month`, `runs` 等状态，并通过 `changeYearMonth` 切换数据。
  - `CompactRunCalendar` 内部处理了月份切换的 UI。
- **目标结构**: 
  - 移除 `CompactRunCalendar` 的引入。
  - 新建或直接在 `maps.tsx` / `components` 中实现一个列表视图。
  - 列表顶部需要有：折叠/展开按钮、年份选择器、月份选择器。
  - 列表主体展示当前 `year` 和 `month` 下的所有 `runs`。
  - 点击列表项能够触发原有的 `locateActivity([run.run_id])`。

## 3. 拟定更改 (Proposed Changes)

由于这是一个相对较大的 UI 结构改变，我计划直接在项目侧边栏新建一个专用的组件 `RunListSidebar`（或者直接在 `maps.tsx` 内联实现，为了保持整洁，建议新建一个组件 `src/components/RunListSidebar/index.tsx`，然后在 `maps.tsx` 中引入）。

### 更改点 1: 创建 `RunListSidebar` 组件
**文件**: `src/components/RunListSidebar/index.tsx` (新建)
- **Props**:
  - `runs`: 当前月份的活动数组 (`Activity[]`)。
  - `year`: 当前年份 (`string`)。
  - `month`: 当前月份 (`number`)。
  - `years`: 可选年份列表 (`string[]`)。
  - `onChangeYearMonth`: 切换年月的回调 `(year: string, month: number) => void`。
  - `onSelectRun`: 点击具体跑步记录的回调 `(runId: number) => void`。
  - `selectedRunId`: 当前选中的活动 ID（用于高亮）。
- **内部状态**:
  - `isCollapsed`: 控制侧边栏是否收起 (`boolean`)。
- **UI 结构**:
  - **Header**: 包含收起/展开 Toggle 按钮。如果未收起，显示年份 Select 和月份 Select（左右箭头切换月份）。
  - **List**: 如果未收起，渲染 `runs` 数组。
    - 列表项使用卡片样式。
    - 左侧显示日期（如 `10月12日`）和标题（如 `Morning Run`）。
    - 右侧显示公里数（如 `5.02 km`）和配速。
    - 点击列表项调用 `onSelectRun`。

### 更改点 2: 修改 `maps.tsx`
**文件**: `d:\code\running_page\src\pages\maps.tsx`
- **移除**: `import CompactRunCalendar from '@/components/CompactRunCalendar';`
- **引入**: `import RunListSidebar from '@/components/RunListSidebar';`
- **状态调整**: 
  - 需要维护当前选中的 `selectedRunId`（目前通过 `locateActivity` 实现，但缺乏明确的单选状态，可以通过 `runs` 是否被 focus 来判断，或者新增状态）。
- **替换组件**:
  将原来的 `CompactRunCalendar` 容器替换为：
  ```tsx
  <div className="absolute right-0 top-0 bottom-0 z-10 pointer-events-none flex flex-col justify-end lg:justify-start lg:right-10 lg:top-10 lg:bottom-10 p-4 lg:p-0">
    <div className="pointer-events-auto">
      <RunListSidebar
        runs={runs}
        year={year}
        month={month}
        years={years}
        onChangeYearMonth={changeYearMonth}
        onSelectRun={(runId) => locateActivity([runId])}
      />
    </div>
  </div>
  ```
  *(注：具体外层样式会根据侧边栏自身的折叠状态在组件内部或外层进行宽度调整)*

### 更改点 3: 工具函数的运用
- 列表项的标题可以使用原数据 `run.name`，如果为空则使用 `titleForRun(run)`。
- 距离使用 `(run.distance / 1000).toFixed(2)`。
- 日期格式化提取 `run.start_date_local`。

## 4. 假设与决策 (Assumptions & Decisions)
- **折叠行为**: 当侧边栏折叠时，只显示一个悬浮的“展开列表”按钮（如图标）。展开时，侧边栏宽度固定（如 `w-80`），高度自适应或最大为屏幕高度减去边距。
- **月份切换**: 保留原日历的交互习惯，在侧边栏 Header 提供 `<` 和 `>` 按钮来切换月份，以及一个下拉框切换年份。
- **移动端适配**: 在移动端，侧边栏默认可能占据底部一半屏幕。折叠功能在移动端同样适用，收起后变成一个小悬浮球或底部窄条。

## 5. 验证步骤 (Verification Steps)
1. 访问地图页面 (`/maps`)。
2. 验证右侧（或底部）显示的是列表而非日历。
3. 点击列表 Header 的左右箭头，验证月份能否正确切换，并且列表数据随之更新。
4. 验证年份切换功能是否正常工作。
5. 点击列表中的某一项，验证地图能否正确飞向 (Fly to) 该跑步轨迹。
6. 点击“折叠/收起”按钮，验证侧边栏能否平滑收起释放地图空间，再次点击能否展开。