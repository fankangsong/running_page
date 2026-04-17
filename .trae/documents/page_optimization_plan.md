# Plan: Optimize Remaining Pages Based on Style Guide

## Summary
Apply the "Dark Sports Theme" and "Big Numbers Layout" rules from `.trae/rules/style-guide.md` to `index.tsx`, `RunDetail.tsx`, and `Tracks.tsx` (including their child components). This includes using italicized gradient text for section titles, `font-condensed font-black` for large numbers, center-aligned metric groups, and subtle gradient backgrounds for card containers.

## Current State Analysis
- **`index.tsx`**: The floating calendar panel has a basic glassmorphism style but lacks the unified `bg-card rounded-card` and gradient background.
- **`Tracks.tsx` & `TracksStats.tsx` & `RunningCharts.tsx`**: Metrics in `TracksStats` use gradient text for values instead of the required `text-primary`. The layout is left-aligned instead of center-aligned. `RunningCharts` lacks a section title and background gradient.
- **`RunDetail.tsx` & `RunDetailPanel.tsx`**: Metrics use gradient text and are left-aligned. The run title doesn't use the new italic gradient section title style. The panel lacks the card container styling.

## Proposed Changes

1. **`src/pages/index.tsx`**:
   - Update the `CompactRunCalendar` wrapper `div` to use `bg-card/90 rounded-card border border-gray-800/50 overflow-hidden relative`.
   - Add the absolute gradient background (`from-white/5 to-transparent`).

2. **`src/components/TracksStats.tsx`**:
   - Wrap the content in `relative bg-card rounded-card border border-gray-800/50 p-6 overflow-hidden`.
   - Add absolute gradient background (`from-sky-500/10 to-transparent`).
   - Add a Section Title: "TRACKS SUMMARY" with an icon, using `font-black italic uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500`.
   - Update the 6 metrics (Journey, Runs, KM, Avg Pace, Countries, Cities) to the Big Numbers Layout: `flex-col items-center text-center`, `text-[10px] md:text-xs font-bold text-secondary uppercase`, and `text-3xl md:text-4xl font-condensed font-black text-primary leading-none tracking-tight`.

3. **`src/components/RunningCharts.tsx`**:
   - Add absolute gradient background (`from-purple-500/10 to-transparent`) to the existing card container.
   - Add a Section Title: "ACTIVITIES MAP" with an icon, using `font-black italic uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500`.

4. **`src/components/RunDetailPanel/index.tsx`**:
   - Wrap the panel in `relative bg-card rounded-card border border-gray-800/50 p-6 md:p-8 overflow-hidden`.
   - Add absolute gradient background (`from-emerald-500/10 to-transparent`).
   - Update the Run Name to the Section Title style: `text-xl md:text-2xl font-black italic uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200`.
   - Refactor the 4 metrics (Distance, Pace, Time, BPM) to the Big Numbers Layout (centered, `text-primary`, `font-condensed font-black`).
   - Refactor the "Monthly Running Distance" to the Big Numbers Layout.
   - Center align the Aerobic Zones graphic.

## Assumptions & Decisions
- The style guide mandates `text-primary` (white) or `text-accent` (orange) for big numbers. I will replace the existing gradient text on numbers with `text-primary` in `TracksStats` and `RunDetailPanel`.
- Section titles will exclusively use the italicized gradient style.
- Card containers will all use the `relative overflow-hidden` + `absolute pointer-events-none` gradient layer pattern.

## Verification Steps
1. Verify `index.tsx` calendar panel has the correct card styling and subtle gradient.
2. Verify `TracksStats` and `RunningCharts` have section titles, gradient backgrounds, and center-aligned Big Number metrics.
3. Verify `RunDetailPanel` has the card styling, gradient background, italicized gradient run name, and center-aligned Big Number metrics.
4. Ensure no text is left using the old gradient style for numbers.