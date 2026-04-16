# ActivityStats 模块重构计划

## 1. 摘要 (Summary)
当前 `ActivityStats` 模块的 UI 样式使用了类似白底黑字的明亮模式样式（如 `bg-gray-100`, `bg-white`, `text-gray-800` 等），与站点整体的深色暗黑风格（如 `bg-card`, `border-gray-800/50`, `text-primary`）显得格格不入。本计划旨在参考首页中 `DashboardStats` 和 `MonthlyBarChart` 等组件的 UI 规范，对其进行重新设计与优化。

## 2. 现状分析 (Current State Analysis)
- 现有模块使用了浅色背景的标签切换和下拉菜单。
- 指标网格区域使用 `bg-gray-50`，在深色背景下非常突兀。
- 图表柱子颜色单一（纯 `bg-blue-400`），无渐变效果，悬停动画较为生硬。
- 未使用统一的设计系统颜色（如 `accent`, `card`, `primary`, `secondary`）。

## 3. 拟议变更 (Proposed Changes)

**目标文件：** `src/components/ActivityStats/index.tsx`

**具体重构步骤：**
1. **外层容器重构**：
   - 移除浅色边框与阴影。
   - 使用统一的卡片样式：`bg-card rounded-card shadow-lg border border-gray-800/50 p-4 lg:p-6 mt-8`。

2. **顶部控制栏重构**：
   - **时间跨度 Tab**：摒弃现有的灰色背景，采用圆角胶囊按钮（类似 `Tracks.tsx` 的年份选择）。未选中态：`bg-gray-800 text-secondary hover:bg-gray-700`，选中态：`bg-accent text-white shadow-md shadow-accent/20`。
   - **中间导航**：文字调整为 `text-primary font-bold text-sm`。左右箭头使用 `hover:bg-gray-800 rounded-full text-secondary` 以融入深色背景。
   - **下拉菜单**：修改为深色外观：`bg-gray-800 border-white/10 text-primary rounded-full px-4 py-1.5 focus:ring-accent`，并添加自定义下拉箭头图标。

3. **图表区域重构**：
   - X 轴分割线采用深色 `border-gray-800/50`。
   - **柱状图**：参考 `MonthlyBarChart` 的效果，应用渐变色 `bg-gradient-to-t from-[#4fc3f7] to-[#81d4fa]`，并加入底部为原点的 Y 轴缩放悬停动画 `origin-bottom group-hover:scale-y-[1.04] opacity-80 group-hover:opacity-100`。
   - **悬停提示 (Tooltip)**：设计一个绝对定位在柱子正上方的浮层：`bg-gray-900/95 backdrop-blur-sm border border-white/10 text-white font-mono rounded px-2 py-1 shadow-xl`，去除原有的简陋文字。
   - **底部文字**：采用 `text-[10px] text-gray-500 group-hover:text-primary`。

4. **底部指标面板重构**：
   - 移除 `bg-gray-50` 卡片背景。
   - 在图表和指标之间添加一条分隔线 `border-t border-gray-800/50 pt-4`。
   - **MetricCard 样式**：标题使用 `text-[10px] font-bold text-secondary uppercase tracking-wider`，数值使用 `text-xl lg:text-2xl font-black text-primary tracking-tight`，单位使用 `text-xs font-medium text-secondary`。

## 4. 假设与决策 (Assumptions & Decisions)
- 保留现有的原生日期处理和指标聚合逻辑，仅对 UI 渲染部分进行样式替换。
- 为保证简单性和兼容性，Tooltip 仍采用 `absolute bottom-full` 相对于单个柱子容器定位的方案，但增加 Tailwind 的模糊和阴影效果使其看起来具有高级感。

## 5. 验证步骤 (Verification Steps)
- 打开 `/heatmap` 页面，检查新增模块的色彩是否完美融入页面的深色主题。
- 尝试切换“周/月/年/全部”以及不同的指标维度，确认 Tab 样式、下拉菜单样式正确，且无排版错乱。
- 悬停在图表柱子上，验证渐变动画是否平滑，悬停气泡是否为深色半透明风格且清晰可见。
- 检查底部数据指标数字是否大号加粗、文本是否为浅灰色（Secondary）。