# Running Page 样式设计指导规则 (Style Guide)

## 1. 摘要 (Summary)

本文档旨在总结 `running_page` 项目当前的 UI 风格设计规范。通过提取 `tailwind.config.js` 及核心组件（如 `DashboardStats`、`MonthlyBarChart`、`Layout`）中的样式模式，形成一套可复用的设计指导规则，确保后续新增模块（如 `ActivityStats`）在视觉和交互上与整体站点保持高度一致的暗黑运动风。

## 2. 现状分析与代表性文件 (Current State & References)

- **全局配置**: [tailwind.config.js](file:///d:/fankangsong/running_page/tailwind.config.js) 奠定了项目深色主题（Dark Mode）的基础色彩和圆角变量。
- **代表性组件**:
  - [DashboardStats/index.tsx](file:///d:/fankangsong/running_page/src/components/DashboardStats/index.tsx): 集中展示了卡片容器、渐变背景、大号加粗的指标数字、灰色小号单位，以及图标与标签的组合排版。
  - [MonthlyBarChart.tsx](file:///d:/fankangsong/running_page/src/components/MonthlyBarChart.tsx): 示范了图表区域的渐变柱状图、悬停交互动画（Scale/Shadow）以及暗色毛玻璃效果的 Tooltip。

## 3. 设计指导规则 (Design Guidelines)

### 3.1 配色规范 (Colors)

项目采用极简的暗黑风格，配合高对比度的点缀色来突出重点数据。

- **背景色 (Background)**: `bg-background` (`#000000`)，纯黑，用于页面最底层。
- **卡片底色 (Card)**: `bg-card` (`#1C1C1E`)，深灰，用于承载内容的模块容器。
- **主文本 (Primary Text)**: `text-primary` (`#FFFFFF`)，纯白，用于主标题、关键指标数字。
- **次级文本 (Secondary Text)**: `text-secondary` (`#8E8E93`)，浅灰，用于单位、说明性文字、未激活的次要标签。
- **强调色 (Accent)**: `text-accent` 或 `bg-accent` (`#FF3B30`)，红色，用于激活状态或极需警示的元素。
- **图表渐变/点缀**: 图表柱状图或特殊图标常用冷色调渐变（如 `from-[#4fc3f7] to-[#81d4fa]`）或特定的 Tailwind 色阶（如 `text-emerald-400`, `text-blue-400`, `text-orange-400`）。

### 3.2 圆角统一规范 (Border Radius)

为保证卡片和控件的圆润感，项目定义了标准的圆角大小。

- **模块/卡片外层**: 统一使用自定义的 `rounded-card` (`1rem` / 16px) 或 `rounded-2xl`，配合 `overflow-hidden`。
- **内部小卡片/弹层**: 使用 `rounded-lg` (8px) 或 `rounded-md` (6px)。
- **标签/胶囊按钮**: 使用 `rounded-full`，形成两端完全半圆的跑道形状。
- **图表柱子顶部**: 使用 `rounded-t` 或 `rounded-t-sm`，底部保持平齐 (`origin-bottom`)。

### 3.3 字号与排版规范 (Typography)

全局字体族为 `font-sans` (`Inter`, `system-ui`)。

- **模块大标题**: `text-xl` 或 `text-2xl font-bold text-primary`。
- **分类标签/小标题**: 极小且大写，`text-[10px] font-bold text-secondary uppercase tracking-wider`。
- **普通说明文本**: `text-xs` 或 `text-sm text-gray-500`。

### 3.4 指标数字与单位设计 (Metrics & Units)

指标展示是本项目的核心，具有非常明确的层级对比设计。

- **指标数字 (Values)**:
  - 必须极其醒目：`text-xl lg:text-2xl` 甚至 `lg:text-3xl`。
  - 字体字重：`font-black` (900)。
  - 间距：`tracking-tight` (收紧字间距)，`leading-none` (无额外行高)。
  - 颜色：`text-primary` (白色)。
  - _可选_：可配合 `CyclingText` 组件增加数字滚动动画。
- **指标单位 (Units)**:
  - 紧跟在数字之后，基线对齐：父容器需使用 `flex items-baseline gap-1`。
  - 字号缩小：`text-xs` (12px)。
  - 字体字重：`font-medium` (500)。
  - 颜色弱化：`text-secondary` (`#8E8E93`)。

## 4. 假设与决策 (Assumptions & Decisions)

- **UI 风格不可偏离**：任何新增模块（如图表、统计面板）必须严格遵守上述深色模式配色和圆角设定，**绝对禁止**大面积使用 `bg-white`, `bg-gray-50` 等亮色背景。
- **交互反馈**：所有的可点击元素（如按钮、图表柱）都应具有基于 Tailwind 的 `hover` 或 `group-hover` 状态反馈（如背景色提亮 `brightness-110`，透明度变化 `opacity-80 -> 100`，或位移伸缩 `scale-y-[1.04]`）。

## 5. 验证步骤 (Verification Steps)

（作为指导规则，此部分用于在后续开发中进行自检）

- 检查新增卡片的 `className` 是否包含 `bg-card rounded-card` 且无违和的白底。
- 检查指标数字是否使用了 `font-black text-primary`，单位是否使用了 `text-xs text-secondary` 且与数字基线对齐。
- 检查鼠标悬停在图表或按钮上时，是否有平滑的过渡动画（如 `transition-all duration-300`）。
