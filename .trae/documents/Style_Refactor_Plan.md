# Plan: Redesign and Refactor Project Style

## 1. Analysis of Current State vs. Target Design

### Current Problems
- **Inconsistency:** Titles, font sizes, colors, and spacing vary across components.
- **Rough Visuals:** Lack of polish, likely due to inconsistent padding/margins and mixed styling approaches (Tailwind vs. SCSS).
- **Layout:** Grid/Flex usage might be inconsistent.

### Target Design (Based on "RUN.LOG" Reference)
- **Theme:** Dark Mode (Black background `#000000` or very dark gray `#111111`).
- **Typography:**
    - **Font Family:** Sans-serif (clean, modern, e.g., Inter, Roboto, or system sans).
    - **Headings:** Bold/Black weight, Uppercase for some metrics labels.
    - **Colors:**
        - Primary Text: White (`#FFFFFF`).
        - Secondary Text (Labels): Gray (`#888888` or similar).
        - Accent Color: Red (`#FF0000` or similar) for highlights (like the "0" in Marathon Events, active tabs).
- **Components:**
    - **Cards:** Rounded corners (approx. `1rem` or `16px`), Dark Gray background (`#1C1C1E` approx), subtle borders or shadow.
    - **Layout:** Grid-based dashboard.
        - Top Row: 3 Stats Cards.
        - Middle Row: Activity Log (Left), Map + Events (Right).
        - Bottom Row: Calendar/Charts.
- **Spacing:** Consistent padding inside cards (`p-6` or `1.5rem`), consistent gaps between grid items (`gap-6` or `1.5rem`).

## 2. Refactoring Plan

### Phase 1: Global Style & Variables Setup
1.  **Tailwind Configuration (`tailwind.config.js`):**
    -   Define custom colors:
        -   `background`: `#000000` (Main Page BG)
        -   `card`: `#1C1C1E` (Card BG)
        -   `primary`: `#FFFFFF` (Main Text)
        -   `secondary`: `#8E8E93` (Subtext)
        -   `accent`: `#FF3B30` (Red Accent from image) or keep existing Neon Green (`$nike`) if preferred, but the image uses Red. *Decision: Let's stick to the image's Red accent for a fresh look, or standardized Neon if user wants to keep identity. The prompt asks to follow the image style, so we will introduce the Red accent.*
    -   Define font sizes and weights to match the "Blocky" look.

2.  **Global SCSS (`src/styles/variables.scss`):**
    -   Update `$dark`, `$light`, `$nike` variables to align with the new palette.
    -   Ensure `Layout/style.module.scss` uses these new variables.

### Phase 2: Component Refactoring (Iterative)

#### Step 1: Layout & Container (`src/components/Layout`, `src/pages/index.tsx`)
-   **Background:** Ensure the main page background is consistent deep black.
-   **Grid:** Update the main grid in `index.tsx` to match the reference layout (if needed) or just fix the spacing `gap-6` and padding `p-6`.

#### Step 2: Dashboard Stats (`src/components/DashboardStats`)
-   **Card Style:** Apply the "Card" look (Rounded corners, Dark Gray BG) to the container.
-   **Typography:** Fix the `TotalStat` we just refactored to ensure it fits perfectly in the new card style (Padding, Font sizes).

#### Step 3: Activity List (`src/components/ActivityList`)
-   **Card Style:** Apply consistent Card styling.
-   **Header:** "Activity Log" title style (Bold, White).
-   **Tabs:** "All", "2026", "2025"... styled as pills. Active = Red/Accent, Inactive = Gray text.
-   **Table:**
    -   Remove borders if present.
    -   Align text properly.
    -   Use the new font sizes.

#### Step 4: Map & Charts (`src/components/RunMap`, `src/components/AnnualStatsChart`)
-   **Container:** Wrap them in the standard Card component/style.
-   **Map:** Ensure it fills the rounded card correctly (`overflow-hidden`).

### Phase 3: Detailed Polish
-   **Padding/Margins:** Audit all `p-*` and `m-*` classes to ensure consistency (e.g., all cards have `p-6`).
-   **Mobile Responsiveness:** Ensure the Grid collapses gracefully.

## 3. Actionable Steps for Next Turn
1.  Update `tailwind.config.js` with new colors.
2.  Update `variables.scss`.
3.  Refactor `Layout` and `index.tsx` for the main grid.
4.  Refactor `DashboardStats` container.
5.  Refactor `ActivityList` container and inner elements.
