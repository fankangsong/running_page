# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

A personal running/activity page that displays workout data on an interactive map with statistics, heatmaps, and charts. Supports syncing data from multiple sources (Garmin, Nike, Strava, GPX, etc.) and deploys to Vercel or GitHub Pages.

## Development Commands

```bash
# Install dependencies
pnpm install

# Start development server (http://localhost:5173)
pnpm develop

# Build for production
pnpm build

# Lint code
pnpm lint

# Format code
pnpm check

# Full CI check (format + lint + build)
pnpm ci
```

## Python Data Sync

```bash
# Install Python dependencies
pip install -r requirements.txt

# Sync from different sources (choose one)
python run_page/garmin_sync.py ${secret_string}        # Garmin
python run_page/garmin_sync.py ${secret_string} --is-cn  # Garmin China
python run_page/nike_sync.py ${refresh_token}          # Nike
python run_page/strava_sync.py ${client_id} ${client_secret} ${refresh_token}  # Strava
python run_page/gpx_sync.py                            # Local GPX files
python run_page/fit_sync.py                            # Local FIT files

# Generate SVG visualizations
python run_page/gen_svg.py --from-db --type github --output assets/github.svg

# Get Garmin secret string (required for Garmin sync)
python run_page/get_garmin_secret.py ${email} ${password}
python run_page/get_garmin_secret.py ${email} ${password} --is-cn  # China region
```

## Environment

- Windows development environment with PowerShell
- Node.js >= 18, Python >= 3.10
- Package manager: pnpm (use `pnpm` not `npm`)
- Dev server runs on port 5173

## Architecture

### Frontend Stack
- **Framework**: React 18 with TypeScript
- **Build**: Vite with hash router (`createHashRouter`)
- **Styling**: Tailwind CSS with custom theme (dark mode only)
- **Map**: Mapbox GL / react-map-gl for route visualization
- **Routing**: react-router-dom v6

### Key Directories
- `src/pages/` - Page components (Index, Tracks, RunDetail, Maps, Hiking)
- `src/components/` - Reusable UI components
- `src/hooks/` - Custom React hooks (`useActivities` is central)
- `src/utils/` - Constants and utility functions
- `src/static/` - Static data including `activities.json` (the activity database)
- `run_page/` - Python scripts for syncing activity data from various sources

### Data Flow
1. Python scripts in `run_page/` fetch activity data from sports apps
2. Data stored in `run_page/data.db` (SQLite) and exported to `src/static/activities.json`
3. React app loads `activities.json` via `useActivities` hook
4. Activities filtered and displayed across pages with maps/charts

### Styling Conventions

This project uses a dark-only theme with specific design patterns. Key Tailwind custom colors:
- `bg-background` (#000000) - Page background
- `bg-card` (#1C1C1E) - Card/container background
- `text-primary` (#FFFFFF) - Main text
- `text-secondary` (#8E8E93) - Subtext/labels
- `text-accent` (#FF3B30) - Highlight color
- `rounded-card` (16px) - Standard card border radius

## Notes

- The dev server (`pnpm develop`) is typically left running manually; do not restart it unnecessarily during sessions.
- Use TypeScript for all new code.
- This is a dark-mode-only application - never use light theme colors like `bg-white`.

## Style Guide (样式设计指导规则)

### Summary

本文档旨在总结 `running_page` 项目当前的 UI 风格设计规范。通过提取 `tailwind.config.js` 及核心组件（如 `DashboardStats`、`MonthlyBarChart`、`Layout`）中的样式模式，形成一套可复用的设计指导规则，确保后续新增模块（如 `ActivityStats`）在视觉和交互上与整体站点保持高度一致的暗黑运动风。

### Current State & References

- **全局配置**: `tailwind.config.js` 奠定了项目深色主题（Dark Mode）的基础色彩和圆角变量。
- **代表性组件**:
  - `src/components/DashboardStats/index.tsx`: 集中展示了卡片容器、渐变背景、大号加粗的指标数字、灰色小号单位，以及图标与标签的组合排版。
  - `src/components/MonthlyBarChart.tsx`: 示范了图表区域的渐变柱状图、悬停交互动画（Scale/Shadow）以及暗色毛玻璃效果的 Tooltip。

### Design Guidelines

#### Colors (配色规范)

项目采用极简的暗黑风格，配合高对比度的点缀色来突出重点数据。

- **背景色 (Background)**: `bg-background` (`#000000`)，纯黑，用于页面最底层。
- **卡片底色 (Card)**: `bg-card` (`#1C1C1E`)，深灰，用于承载内容的模块容器。
- **主文本 (Primary Text)**: `text-primary` (`#FFFFFF`)，纯白，用于主标题、关键指标数字。
- **次级文本 (Secondary Text)**: `text-secondary` (`#8E8E93`)，浅灰，用于单位、说明性文字、未激活的次要标签。
- **强调色 (Accent)**: `text-accent` 或 `bg-accent` (`#FF3B30`)，红色，用于激活状态或极需警示的元素。
- **图表渐变/点缀**: 图表柱状图或特殊图标常用冷色调渐变（如 `from-[#4fc3f7] to-[#81d4fa]`）或特定的 Tailwind 色阶（如 `text-emerald-400`, `text-blue-400`, `text-orange-400`）。

#### Border Radius (圆角统一规范)

为保证卡片和控件的圆润感，项目定义了标准的圆角大小。

- **模块/卡片外层**: 统一使用自定义的 `rounded-card` (`1rem` / 16px) 或 `rounded-2xl`，配合 `overflow-hidden`。
- **内部小卡片/弹层**: 使用 `rounded-lg` (8px) 或 `rounded-md` (6px)。
- **标签/胶囊按钮**: 使用 `rounded-full`，形成两端完全半圆的跑道形状。
- **图表柱子顶部**: 使用 `rounded-t` 或 `rounded-t-sm`，底部保持平齐 (`origin-bottom`)。

#### Typography (字号与排版规范)

全局字体族为 `font-sans` (`Inter`, `system-ui`)，用于数字的特殊字体为 `font-condensed`。

- **模块大标题 (Section Titles)**：
  - 必须极其醒目且具有动感：`text-xl md:text-2xl font-black italic uppercase tracking-wider`。
  - **渐变色文字 (Gradient Text)**：废弃纯色文字，统一使用主题相关的渐变色填充文字（例如：`text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200`）。
- **分类标签/小标题**: 极小且大写，`text-[10px] font-bold text-secondary uppercase tracking-wider`。
- **普通说明文本**: `text-xs` 或 `text-sm text-gray-500`。

#### Big Numbers Layout (指标大数字排版与设计)

指标展示是本项目的核心，采用极端的对比设计来引导视觉焦点，具有非常明确的层级和空间规范。

- **空间布局 (Layout)**：
  - **居中对齐**：使用 `items-center text-center` 确保数字在卡片网格中稳定居中。
  - **疏密间距**：单个数据项内部（Label、Value、Subtext）间距极小（`gap-1`）；而卡片外部留白和数据项之间留白较大（`p-6 md:p-8`, `gap-6 md:gap-8`），提供充足的“呼吸空间”。
- **分类标签 (Label)**：
  - 必须作为顶部说明书：极小字号 `text-[10px] md:text-xs`。
  - 大写且拉宽间距：`uppercase tracking-wider`。
  - 颜色弱化：`text-secondary` (`#8E8E93`)。
- **核心指标数字 (Values)**：
  - 必须极其醒目：`text-3xl md:text-4xl` 甚至更大。
  - 紧凑型字体与字重：`font-condensed font-black` (900)。
  - 间距：`tracking-tight` (收紧字间距)，`leading-none` (无额外行高)。
  - 颜色语义：
    - 客观汇总数据使用 **纯白色 (`text-primary`)**。
    - 荣誉/突破性数据（如 PB）使用 **高亮橙红色 (`text-accent`)** 以提供情绪奖励。
  - _可选_：可配合 `CyclingText` 组件增加数字滚动动画。
- **指标单位 (Units)**：
  - 紧跟在数字之后，基线对齐：父容器需使用 `flex items-baseline gap-1`。
  - 字号缩小：`text-xs` (12px)。
  - 字体字重：`font-medium` (500)。
  - 颜色弱化：`text-secondary` (`#8E8E93`)。
- **底部补充 (Subtext)**：
  - 小字号灰色常规体：`text-[10px] md:text-xs font-medium text-gray-500`，用于提供日期或上下文。

#### Background & Texture (背景质感与层次)

为了避免纯色卡片过于死板，增加 UI 的厚度和光源感：

- **卡片底色**：基于 `bg-card` 和 `border-gray-800/50` 描边。
- **顶部渐变点缀 (Gradient)**：在卡片内部顶部加入绝对定位的微弱向下渐隐层（如 `from-white/5 to-transparent` 或呼应主题色的 `from-orange-500/10 to-transparent`），并设置 `pointer-events-none` 避免遮挡交互。

### Assumptions & Decisions

- **UI 风格不可偏离**：任何新增模块（如图表、统计面板）必须严格遵守上述深色模式配色和圆角设定，**绝对禁止**大面积使用 `bg-white`, `bg-gray-50` 等亮色背景。
- **交互反馈**：所有的可点击元素（如按钮、图表柱）都应具有基于 Tailwind 的 `hover` 或 `group-hover` 状态反馈（如背景色提亮 `brightness-110`，透明度变化 `opacity-80 -> 100`，或位移伸缩 `scale-y-[1.04]`）。

### Verification Steps

When adding new UI components, verify:

- 检查新增卡片的 `className` 是否包含 `bg-card rounded-card` 且无违和的白底。
- 检查模块大标题是否使用了斜体和渐变色文字（`italic text-transparent bg-clip-text bg-gradient-to-r`）。
- 检查指标数字是否使用了 `font-condensed font-black` 且居中对齐，单位是否使用了 `text-xs text-secondary` 且与数字基线对齐。
- 检查鼠标悬停在图表或按钮上时，是否有平滑的过渡动画（如 `transition-all duration-300`）。
