# Plan: Home Page Optimization

This plan addresses the UI/UX improvements for the Home page, focusing on navigation, layout consolidation, and scrollbar removal.

## 1. Navigation Update (`src/static/site-metadata.ts`)
-   **Objective**: Add "Home" to the navigation menu.
-   **Action**: Add `{ name: 'Home', url: '/' }` to the beginning of the `navLinks` array.

## 2. Merge & Optimize Dashboard Stats
-   **Objective**: Combine Total, Area, and Habit stats into a single, cohesive block without scrollbars.
-   **Files**: `src/components/DashboardStats/index.tsx`, `TotalStat.tsx`, `AreaStat.tsx`, `HabitStat.tsx`.
-   **Actions**:
    -   **`TotalStat.tsx`**:
        -   Remove the outer `bg-gray-800` container and "Total" title.
        -   Refactor content into a compact grid (e.g., 2x2) for Distance, Runs, Pace, etc.
        -   Ensure text alignment is consistent.
    -   **`AreaStat.tsx`**:
        -   Remove the outer `bg-gray-800` container.
        -   Remove the scrolling list of cities. instead, show top 5-6 cities in a static list or a compact flex layout.
        -   Keep the summary numbers (Years, Countries, etc.).
    -   **`HabitStat.tsx`**:
        -   Remove the outer `bg-gray-800` container.
        -   Remove scrollbar. Show all habits (since there are usually few) or a fixed number that fits.
    -   **`index.tsx`**:
        -   Create a single wrapper `div` with `bg-gray-800 shadow-lg`.
        -   Use a `grid-cols-3` layout (stacking on mobile) to house the three modified components.
        -   Add vertical dividers (borders) between sections on desktop.

## 3. Activity List Optimization (`src/components/ActivityList/index.tsx`)
-   **Objective**: Remove visual scrollbars while maintaining functionality or layout integrity.
-   **Action**:
    -   Add CSS to hide the scrollbar (`scrollbar-width: none` for Firefox, `::-webkit-scrollbar { display: none }` for Chrome/Safari) to the list container.
    -   Ensure the container height allows for "beautiful" display without awkward cutoffs (maybe adjust `max-h`).

## 4. Verification
-   Check "Home" link in header.
-   Verify the Dashboard Stats block is a single unit.
-   Verify no visible scrollbars in any module.
-   Verify alignment of text and numbers in the stats block.
