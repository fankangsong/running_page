# Tracks 页面视觉优化计划

## 目标

对 `/running/tracks` 页面做视觉一致性优化，使其与首页（`/running/`）的卡片、按钮、字号体系保持一致，并提升 SVG 展示有效区域。

## 范围

- 主要入口： [Tracks.tsx](file:///d:/fankangsong/running_page/src/pages/Tracks.tsx)
- 关联组件（为满足“左侧字号/ SVG 边距”要求需要同步调整）：
  - [TracksStats.tsx](file:///d:/fankangsong/running_page/src/components/TracksStats.tsx)
  - [TracksGrid.tsx](file:///d:/fankangsong/running_page/src/components/TracksGrid.tsx)
- 参考首页样式：
  - 年份按钮样式参考 [ActivityList/index.tsx](file:///d:/fankangsong/running_page/src/components/ActivityList/index.tsx#L28-L47)
  - 卡片容器参考 [index.tsx](file:///d:/fankangsong/running_page/src/pages/index.tsx#L125-L162)

## 方案

### 1) 年份按钮居左 + 颜色与首页一致

- 调整 `Tracks.tsx` 年份按钮容器：
  - `justify-center` → `justify-start`
  - 将按钮 className 改为与首页 ActivityList 相同的 token 组合（`bg-accent / bg-gray-800`、`text-primary / text-secondary`、`rounded-full`、`transition-all` 等）
  - “Total” 按钮使用同一套逻辑与样式（active/inactive 一致）

### 2) 左侧统计文本字号下调，与首页呼应

- 调整 `TracksStats.tsx`：
  - 将当前 `text-5xl` 一类的大字号下调到与首页 TotalStat 的数字字号接近（例如 `text-[32px]`/`text-3xl` 级别），并同步下调描述字号（`text-sm`/`text-xs`）
  - 颜色使用首页已有的 token（例如 `text-primary`、`text-secondary`、渐变/强调色保持一致风格）
  - 保持信息结构不变（year、runs、km、pace、streak、hr），只调整排版与字号

### 3) 去掉 SVG 与外容器之间边距（更大展示区域）

- 调整 `TracksGrid.tsx`：
  - 移除外层包裹的 `p-4`（以及不必要的额外背景色），改用与首页一致的卡片容器（`bg-card rounded-card border ... overflow-hidden`）
  - 去掉 SVG 本身的 `max-w-*` 限制或改为更宽松的策略（按页面容器宽度最大化展示）
  - 保持 `w-full h-auto` 以适配响应式宽度

### 4) 整体容器/按钮圆角与首页一致

- 调整 `Tracks.tsx` 页面结构：
  - 将年份按钮区与主内容区用 `bg-card rounded-card shadow-lg border border-gray-800/50` 组合包裹，圆角使用 `rounded-card`（与首页一致）
  - 按钮圆角统一为 `rounded-full`
  - 统一 padding（参考首页：卡片内部 `p-6`，页面外层 `p-4`）

## 验证方式

- 本地启动开发服务后访问 `http://localhost:5173/running/tracks`：
  - 年份按钮左对齐，且 active/inactive 配色与首页一致
  - 左侧统计字号较之前明显变小且与首页风格一致
  - SVG 四周不再有额外 padding，显示区域更大
  - 卡片/按钮圆角与首页一致（`rounded-card`/`rounded-full`）
- 运行构建校验（如遇 `dist/images` 权限问题，使用自定义 outDir 验证）：
  - `pnpm run build` 或 `pnpm exec vite build --outDir dist2 --emptyOutDir`

## 交付物

- 更新后的 `Tracks.tsx` / `TracksStats.tsx` / `TracksGrid.tsx`（仅样式与布局调整，不改变业务数据计算逻辑）

