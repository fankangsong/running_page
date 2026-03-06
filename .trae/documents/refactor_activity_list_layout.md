# 重构 ActivityCardList 为 Hiking, Cycling, Walking 三列布局

目标：将原本的混合卡片列表改为三列布局，分别展示 Hiking, Cycling, Walking 活动。每列顶部有统计标题，内容项移除卡片样式，采用更简约的设计。

## 步骤

1.  **修改 `ActivityCardList/index.tsx`**:
    -   **数据分组**：
        -   将传入的 `activities` 根据类型分为三组：
            -   **Hiking**: `HIKE_TYPE`
            -   **Cycling**: `RIDE_TYPE`, `VIRTUAL_RIDE_TYPE`, `EBIKE_RIDE_TYPE`
            -   **Walking**: `WALK_TYPE` (需要确保引入 `WALK_TYPE`)
        -   每组数据同样需要过滤掉没有 polyline 的记录，并按时间倒序排列。
    -   **布局调整**：
        -   使用 3 列 Grid 布局 (`grid-cols-1 lg:grid-cols-3`)，但在小屏幕下保持单列。
        -   每一列作为一个独立的 Section。
    -   **列标题**：
        -   每列顶部展示标题，格式为：`[图标] [类型名称] / [次数] times`。
        -   例如：`🏞️ Hiking / 12 times`。
    -   **列表渲染**：
        -   在每列中遍历对应的数据，渲染 `ActivityCard`（或重命名为 `ActivityItem`）。

2.  **修改 `ActivityCardList/ActivityCard.tsx`**:
    -   **重命名建议**：虽然文件名可以不改，但语义上它不再是一个 "Card"。
    -   **移除卡片容器**：
        -   移除 `bg-card`, `border`, `rounded-lg`, `shadow` 等样式。
        -   移除 `hover` 背景色，或者改为更微妙的交互效果。
    -   **新布局设计**：
        -   **左侧边框**：添加左侧边框 (`border-l-2`)，颜色可以用不同类型区分，或者统一使用灰色/强调色。
        -   **内容排版**：
            -   **Polyline**：保留，但可能调整尺寸或样式。
            -   **信息展示**：
                -   第一行：标题 (Run Name)。
                -   第二行：距离 (11km) + 用时 (1h 22m)。
                -   第三行：日期 (2025-11-23)。
            -   **字体/错位设计**：
                -   距离和时间可以使用不同字号或颜色（如距离大一点，时间灰色）。
                -   日期使用较小的灰色字体。
                -   可以尝试将 Polyline 放在右侧，或者作为背景（视情况而定，但根据描述“polyline + 标题”，可能是左图右文）。
    -   **数据格式化**：
        -   需要引入/使用 `convertMovingTime2Sec` 或类似工具将 `moving_time` 格式化为 `1h 22m` 格式。
        -   距离保留整数或一位小数。

3.  **样式细节优化**:
    -   **间距**：列与列之间 `gap-8`，列表项之间 `gap-6`。
    -   **装饰**：左侧边框颜色可以根据运动类型变化（如 Hiking 绿色，Cycling 蓝色，Walking 黄色/灰色）。

## 验证
-   确认三列正确显示对应类型的数据。
-   确认无数据的列如何显示（隐藏或显示 0 times）。
-   确认点击列表项仍然能正确触发 `onClick` 回调。
