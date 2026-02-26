# Plan for Running Page Refactoring

This plan outlines the steps to refactor the running page layout and styling as per the user's request.

## 1. Environment Setup

- [ ] Install `tailwindcss`, `postcss`, and `autoprefixer`.
- [ ] Initialize Tailwind CSS configuration.
- [ ] Configure `tailwind.config.js` to scan source files.
- [ ] Add Tailwind directives to the main CSS/SCSS file.

## 2. Component Refactoring & Extraction

- [ ] **Extract SVG Components**: Separate `GithubSvg` (Calendar) and `GridSvg` (Tracks) from `src/components/SVGStat`.
- [ ] **Create Dashboard Stats Components**:
    - Extract logic from `LocationStat` and `YearStat` to create standalone stat components for the dashboard (Total, Area, Habits).
    - Create a `DashboardStats` container component for the top row of the left column.
- [ ] **Create Annual Stats Chart Component**:
    - Extract the `YearSVG` logic from `YearStat` into a new `AnnualStatsChart` component for the right column.
- [ ] **Create Activity List Component**:
    - Create a component that switches between `GithubSvg` (Calendar) and `RunTable` based on a tab selection.
- [ ] **Refactor RunMap**:
    - Ensure `RunMap` fits the new layout container.

## 3. Layout Implementation (Home Page)

- [ ] **Update `src/pages/index.tsx`**:
    - Implement a 2-column layout using Tailwind Grid/Flex.
    - **Left Column**:
        - Row 1: `DashboardStats` (Total, Area, Habits).
        - Row 2: `ActivityList` (Tabs for Calendar/Table).
    - **Right Column**:
        - Row 1: `RunMap`.
        - Row 2: `AnnualStatsChart`.
    - Implement state management for `year` selection to update Map, Stats, and Calendar/Table.

## 4. Tracks Page Implementation

- [ ] **Create `src/pages/Tracks.tsx`**:
    - Implement a page dedicated to the `GridSvg` (10km tracks).
- [ ] **Update Routing (`src/main.tsx`)**:
    - Add a route for `/tracks`.
    - Add navigation links (e.g., in the Header or a sidebar) to switch between Home and Tracks.

## 5. Styling & Cleanup

- [ ] **Apply Tailwind Styling**:
    - Replace `tachyons` classes with Tailwind classes.
    - Enforce "no rounded corners" (`rounded-none`).
    - Remove `rem`/`em` scaling if present.
    - Add animations (e.g., fade-in for tabs).
- [ ] **Clean Up**:
    - Remove unused CSS/SCSS files or `tachyons` imports.
    - Ensure responsiveness (stack columns on mobile).

## 6. Verification

- [ ] Verify the layout matches the provided screenshot (Image 5).
- [ ] Verify interactivity (Year switching updates all components).
- [ ] Verify navigation to the Tracks page.
