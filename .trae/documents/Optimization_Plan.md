# Optimization Plan

Based on the review of the current implementation and the provided screenshot, several issues and areas for improvement have been identified.

## 1. Shortcomings & Issues

* **Activity List Overflow**: The `RunTable` inside `ActivityList` lacks a height constraint, causing the left column to expand indefinitely and breaking the layout balance. It needs to be scrollable within a fixed viewport.

* **Empty Chart Area**: The `AnnualStatsChart` component returns `null` (or an empty message) when the "Total" year is selected, leaving a large empty space in the bottom-right corner.

* **Dashboard Stats Styling**: The current stats cards are functional but lack visual polish (typography, spacing, icons) to match a "dashboard" aesthetic.

* **Map Layout**: The map container needs to coordinate better with the other components in terms of height.

## 2. Optimization Plan

### Layout & Scrolling

* [ ] **Constraint Activity List Height**:

  * Update `src/components/ActivityList/index.tsx` to set a `max-height` (e.g., `calc(100vh - header - stats)` or a fixed pixel value like `h-[600px]`) for the content area.

  * Add `overflow-y-auto` to the container wrapping `RunTable` and `RunningCalendar` to enable internal scrolling.

  * Update `RunTable` styles if necessary to ensure the header remains visible (sticky header) or just scroll the whole table.

### Component Logic Enhancements

* [ ] **Handle "Total" in Annual Stats**:

  * Update `src/components/AnnualStatsChart/index.tsx`.

  * When `year === 'Total'`, instead of showing nothing, display the **Tracks Grid** (`GridSvg` from `src/components/TracksGrid.tsx`) or a similar global summary visualization. This fills the empty space with meaningful data.

### Styling Improvements

* [ ] **Refine Dashboard Stats**:

  * Update `src/components/DashboardStats/*.tsx` components.

  * Improve font sizes (make numbers larger/clearer).

  * Add better padding and maybe subtle borders or background differentiation to separate them from the main background.

  * Ensure the list of cities/habits is scrollable if it gets too long, matching the card height.

### Layout Tweaks

* [ ] **Map & Chart Container**:

  * Ensure the right column components (`RunMap` and `AnnualStatsChart`) have appropriate heights to align roughly with the left column's content or fit the screen better.

## 3. Verification

* [ ] Verify that the `ActivityList` scrolls and doesn't stretch the page.

* [ ] Verify that selecting "Total" shows the Tracks Grid in the bottom right.

* [ ] Verify that selecting a specific year shows the annual circular chart.

* [ ] Check the visual appeal of the top stats cards.

