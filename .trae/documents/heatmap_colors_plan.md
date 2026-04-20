# 年度热力图颜色区分方案 (Annual Heatmap Color Scheme Plan)

## 1. 目标 (Summary)
修改 `AnnualHeatmap` 组件，将原本基于最大值比例计算的单色透明度热力图，改为基于绝对里程区间的**多色显示方案**，并同步更新底部图例。

## 2. 当前状态分析 (Current State Analysis)
- 目前 `src/components/AnnualHeatmap/index.tsx` 中的 `getIntensityClass` 函数通过计算 `value / maxValue` 的比例来决定使用 `bg-accent` 的哪种透明度。
- 图例（Legend）硬编码了从 `bg-card` 到 `bg-accent` 的 6 个颜色块，两侧标注 "Less" 和 "More"。
- 鼠标悬浮的 Tooltip 已经显示了具体的公里数（km）。

## 3. 提议的更改 (Proposed Changes)

### 3.1 修改颜色映射逻辑
修改 `src/components/AnnualHeatmap/index.tsx` 中的 `getIntensityClass` 函数，移除对 `maxValue` 的依赖，改为按以下绝对里程阈值返回颜色（颜色参考 Tailwind 默认色板及项目风格指南）：
- `value === 0`: `bg-card border border-gray-800` (无活动，保持不变)
- `value < 5`: `bg-emerald-400` (绿色，短距离)
- `value < 10`: `bg-blue-400` (蓝色，中距离)
- `value < 15`: `bg-yellow-400` (黄色，长距离)
- `value < 20`: `bg-orange-400` (橙色，次长距离)
- `value >= 20`: `bg-accent` (项目主题红色，半马及以上)

### 3.2 移除冗余代码
删除用于计算 `maxValue` 的 `useMemo` 代码块，因为颜色判断已不再需要相对比例。

### 3.3 同步修改图例 (Legend)
更新底部的图例区域，使其准确反映新的颜色和里程区间：
- 将原本的透明度方块替换为新的多色方块 (`bg-emerald-400`, `bg-blue-400`, 等)。
- 为每个方块添加原生的 `title` 属性（如 `title="< 5 km"`，`title="5 - 10 km"`），提供原生提示。
- 将两端的文字从 "Less" / "More" 修改为更具指示性的里程文本，如左侧保留文字提示即可，或者直接依靠颜色方块加悬浮提示保持界面极简。方案：左侧文本改为 `Distance:`，右侧方块依次排列，鼠标悬浮显示里程区间。

## 4. 假设与决策 (Assumptions & Decisions)
- 里程数据以**公里(km)**为单位（与现有 Tooltip 中的 `km` 单位一致）。
- 大于等于 20km 的数据全部归入最高档位（红色 `bg-accent`）。
- 选用 `400` 亮度的 Tailwind 颜色（如 `emerald-400`），在项目的深色背景（Dark Mode）下具有较好的对比度和视觉表现。

## 5. 验证步骤 (Verification)
1. 确认修改后的 `AnnualHeatmap` 在没有数据（0）时保持暗灰框。
2. 确认当传入不同区间数据时，格子颜色能正确显示为绿、蓝、黄、橙、红。
3. 检查底部图例是否正确展示了上述 5 种颜色，并且两端文本描述合理。
4. 确保构建/类型检查通过，无 TypeScript 报错。