# Plan: Heatmap & ActivityStats Layout Optimization

## Summary
Refine the layout and visual presentation of the `Heatmap` page and the `ActivityStats` component. The goal is to align these modules with the newly established "Big Numbers" and "Dark Sports Theme" design guidelines, ensuring a consistent, high-end visual experience across the entire dashboard.

## Current State Analysis
1. **Heatmap Page (`src/pages/Heatmap.tsx`)**:
   - The Heatmap card has a basic header with run count and distance.
   - It lacks the "Big Numbers" typography and gradient background styling introduced in `DashboardStats`.
2. **ActivityStats Component (`src/components/ActivityStats/index.tsx`)**:
   - The metrics grid uses `MetricCard` components that don't fully leverage the new "Big Numbers" layout rules (e.g., center alignment, extreme contrast).
   - The chart area and controls are functional but could benefit from tighter spacing and better alignment with the new aesthetic.
   - The "Aerobic Zones" graphic is somewhat detached from the rest of the metrics grid styling.

## Proposed Changes

### 1. `src/pages/Heatmap.tsx` - Heatmap Card Redesign
- **Apply Gradient Background**: Add a subtle absolute positioned gradient background (`from-orange-500/10 to-transparent`) to the Heatmap card to match the `PERSONAL BESTS` card style.
- **Header Redesign**: 
  - Replace the basic `<h2>` with a proper "Big Numbers" layout for the yearly total distance and runs.
  - The values should use the `text-accent` (orange) color.
  - Use a flex layout to separate the "Big Numbers" stats from the `YearSelector` control.
  - Add an icon (e.g., a calendar or map icon) next to a "YEARLY HEATMAP" label.

### 2. `src/components/ActivityStats/index.tsx` - ActivityStats Redesign
- **Apply Gradient Background**: Add a subtle absolute positioned gradient background (`from-white/5 to-transparent`) to the ActivityStats card.
- **Section Title**: Add a clear section title (e.g., "ACTIVITY TRENDS") with an icon (e.g., a trend line) at the top of the card.
- **MetricCard Refactoring**:
  - Update the internal `MetricCard` component to follow the `BigNumberStat` layout rules from the style guide:
    - Center alignment (`flex-col items-center text-center`).
    - Top label (`text-[10px] md:text-xs font-bold text-secondary uppercase tracking-wider`).
    - Main value (`text-3xl md:text-4xl font-condensed font-black tracking-tight leading-none`).
    - Unit (`text-xs font-medium text-secondary`).
- **Aerobic Zones Refactoring**:
  - Adjust the "Aerobic Zones" graphic to fit better within the new centered metrics grid.

## Assumptions & Decisions
- The newly established style guide rules (`.trae/rules/style-guide.md`) are the source of truth for all layout and typography decisions.
- The `ActivityStats` component's existing logic (filtering, calculating) is correct and should not be modified, only its presentation.
- The `AnnualHeatmap` component itself (the grid of squares) is visually fine, but its container in `Heatmap.tsx` needs the styling upgrade.

## Verification Steps
1. Verify the Heatmap card has a subtle gradient background and a "Big Numbers" style header.
2. Verify the ActivityStats card has a subtle gradient background and a clear section title.
3. Check that all metric cards within ActivityStats are center-aligned and use the large, condensed, black typography for values.
4. Ensure all text remains in English.
5. Confirm the page layout looks cohesive when viewing `DashboardStats`, `Heatmap`, and `ActivityStats` together.