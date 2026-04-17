# Running Page 字体优化升级方案

## 1. 摘要 (Summary)
本项目当前的 UI 风格为暗黑运动风（Dark Sports Style）。为了进一步增强数据面板的“竞技感”与“科技感”，计划将现有的默认字体全面升级为 **Roboto** 与 **Roboto Condensed**。
- **Roboto**: 作为全局基础字体（Body Text），提供极佳的屏幕阅读清晰度，用于普通文本、次级标签和说明。
- **Roboto Condensed**: 作为展示型字体（Display Text），其紧凑的字宽非常适合运动数据大屏，专门用于大号的指标数字（Metrics）、图表刻度以及关键标题，能在有限空间内展示更大、更具视觉冲击力的数值。

## 2. 现状分析 (Current State)
通过分析现有代码：
- **配置**: `tailwind.config.js` 中 `fontFamily.sans` 配置为 `['Inter', 'system-ui', 'sans-serif']`。
- **样式**: `src/styles/variables.scss` 中 `$global-font-family` 将 `Inter` 作为首选。
- **缺失**: 目前项目中并未显式引入（`@font-face` 声明或网络请求）`Inter` 字体文件，导致不同设备上的渲染完全依赖系统本地环境，缺乏跨平台的一致性。

## 3. 字体设计方案 (Proposed Changes)

### 3.1 字体映射规则
- **全局正文 (Sans)**: 使用 **Roboto**。应用场景：导航、描述性文本、单位文本（如 `text-xs text-secondary`）。
- **数字与强调 (Condensed)**: 使用 **Roboto Condensed**。应用场景：数据看板的巨大数值（如 `DashboardStats` 中的公里数、配速等 `text-2xl font-black` 元素），以及紧凑的分类标签。

### 3.2 字体引入方式与本地链接
为了保证加载速度、断网可用性以及彻底解决跨端渲染不一致的问题，强烈建议**本地化部署**字体。

**方案A（推荐：基于 npm 的工程化管理）**：
通过 `pnpm` 安装 `@fontsource` 依赖包，直接在项目中引入，由 Vite 自动打包并优化（按需引入字重）：
- 执行安装：`pnpm add @fontsource/roboto @fontsource/roboto-condensed`
- 在代码中引入：
  ```typescript
  import '@fontsource/roboto/400.css';
  import '@fontsource/roboto/500.css';
  import '@fontsource/roboto/700.css';
  import '@fontsource/roboto-condensed/700.css';
  import '@fontsource/roboto-condensed/900.css'; // Black 字重专门用于大号指标
  ```

**方案B（手动下载本地字体文件）**：
如果希望手动管理静态资源，可从以下 Google Fonts 官方页面下载打包好的字体文件（提取其中的 `.woff2` 格式），放入 `src/assets/fonts/` 目录下，并在 `index.scss` 中通过 `@font-face` 引入：
- **Roboto**: [https://fonts.google.com/specimen/Roboto](https://fonts.google.com/specimen/Roboto)
- **Roboto Condensed**: [https://fonts.google.com/specimen/Roboto+Condensed](https://fonts.google.com/specimen/Roboto+Condensed)

### 3.3 Tailwind 配置修改
更新 `tailwind.config.js`，增加对应的字体族映射：
```javascript
theme: {
  extend: {
    fontFamily: {
      sans: ['Roboto', 'system-ui', 'sans-serif'], // 替换原有的 Inter
      condensed: ['"Roboto Condensed"', 'system-ui', 'sans-serif'], // 新增运动紧凑字体族
    }
  }
}
```

### 3.4 核心组件样式替换计划
根据项目的样式设计指导规则（Style Guide），我们将对核心数据展示组件进行微调：
- **DashboardStats / 核心数值**: 将现有的 `font-black text-primary` 结合新增的 `font-condensed` 类名，例如：`className="font-condensed font-black text-2xl text-primary tracking-tight"`。
- **单位 (Units)**: 保持 `font-sans text-xs text-secondary`。
- **图表 (MonthlyBarChart)**: 坐标轴的刻度标签和 Tooltip 中的数值使用 `font-condensed`。

## 4. 假设与决策 (Assumptions & Decisions)
- **决策**：引入真实字体文件（推荐方案A `@fontsource`）以保证跨设备（Windows/Mac/iOS/Android）字体渲染的绝对一致性，这对于强视觉对齐的数据可视化尤为关键。
- **决策**：仅引入项目中实际使用到的字重（如 Regular 400, Medium 500, Bold 700, Black 900），避免无差别全量加载字体导致页面性能下降。

## 5. 验证步骤 (Verification Steps)
1. 检查页面全局正文文本的计算字体（Computed Font）是否正确应用了 `Roboto`。
2. 检查 `DashboardStats` 模块中大号数字指标的计算字体是否正确应用了 `Roboto Condensed`。
3. 检查浏览器 Network 面板，确认页面加载时是否成功拉取了 `.woff2` 字体文件，且无 404 错误。