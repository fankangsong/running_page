# Plan: Layout Adjustment & Feature Enhancements

This plan addresses the UI/UX improvements requested for the Home page layout, Dashboard alignment, Activity List structure, and the Tracks page functionality.

## 1. Home Page Layout & Map (`src/pages/index.tsx`)
-   **Objective**: Adjust column ratio to 60/40 and set Map to 1:1 aspect ratio.
-   **Actions**:
    -   Update the main grid to use `lg:grid-cols-10` (or 5).
    -   Set Left Column to `lg:col-span-6` (60%).
    -   Set Right Column to `lg:col-span-4` (40%).
    -   Update the Map container styling to enforce a 1:1 aspect ratio (`aspect-square` or inline style).

## 2. Dashboard Stats Alignment (`src/components/DashboardStats/*.tsx`)
-   **Objective**: Align text and content to the top (per screenshot).
-   **Actions**:
    -   Modify `TotalStat.tsx`, `AreaStat.tsx`, and `HabitStat.tsx`.
    -   Change flex container alignment from `justify-center` to `justify-start` / `items-start`.
    -   Adjust spacing/margins (`mb-*`) to ensure consistent top alignment for titles ("Total", "Years", "Habits").

## 3. Activity List Refactoring (`src/components/ActivityList/index.tsx`)
-   **Objective**: Remove tabs and display Calendar above Table.
-   **Actions**:
    -   Remove `view` state and the "Table/Calendar" toggle buttons.
    -   Render `RunningCalendar` immediately after the Year filter buttons.
    -   Render `RunTable` below the `RunningCalendar`.
    -   Ensure both components fit well within the container (adjust height constraints if necessary).

## 4. Tracks Page Enhancements (`src/pages/Tracks.tsx`, `src/components/TracksGrid.tsx`)
-   **Objective**: Add Annual Stats/Year Selector and switch Grid chart by year.
-   **Actions**:
    -   **Update `TracksGrid.tsx`**:
        -   Accept a `year` prop.
        -   Dynamically load the corresponding SVG (`grid.svg` for Total, `grid_{year}.svg` for specific years) using the `gridStats` export from `assets/index.tsx` (which we verified exists).
    -   **Update `Tracks.tsx`**:
        -   Import `useActivities` to get the list of years.
        -   Implement a Year Selector (similar to Home page or a Stats Module).
        -   Pass the selected `year` state to `TracksGrid`.
        -   Add a header/summary section if needed to match "Annual Stats Module" description (likely the Year buttons).

## 5. Verification
-   Check the 60/40 split on the Home page.
-   Verify the Map is square.
-   Verify Dashboard Stats are top-aligned.
-   Verify Activity List shows Calendar then Table, without tabs.
-   Verify Tracks page allows switching years and updates the Grid chart accordingly.
