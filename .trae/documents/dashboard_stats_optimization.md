# Plan: DashboardStats Layout Optimization

## Summary
Redesign the `DashboardStats` component to match the reference image's layout and styling details. The new design splits the stats into two distinct, vertically stacked cards ("SUMMARY" and "PERSONAL BESTS"), both utilizing a "Big Numbers" layout with center-aligned text, large typography for values, and icons placed next to the section titles.

## Current State Analysis
- The existing `DashboardStats` component renders a single card split horizontally into "Total Stats" and "PB Stats".
- The layout uses smaller font sizes for values and places an icon next to each individual stat label.
- The UI does not fully leverage the large, bold typography seen in the "PERSONAL BESTS" section of the reference image.

## Proposed Changes

**File:** `src/components/DashboardStats/index.tsx`

1. **Component Structure Update**:
   - Replace the horizontal split layout with two vertically stacked `div` containers (Cards).
   - Card container classes: `w-full bg-card rounded-card shadow-lg border border-gray-800/50 p-6 md:p-8`.
   - Add a section title to each card with an icon:
     - "SUMMARY" (Activity/Wave Icon)
     - "PERSONAL BESTS" (Lightning Icon)

2. **StatItem Redesign (Big Numbers Layout)**:
   - Rename/update the internal `StatItem` component to center-align content.
   - **Top Label**: `text-[10px] md:text-xs font-bold text-secondary uppercase tracking-wider`.
   - **Main Value**: `text-3xl md:text-4xl font-condensed font-black tracking-tight leading-none`.
   - **Unit**: `text-xs font-medium text-secondary`.
   - **Bottom Subtext**: `text-[10px] md:text-xs font-medium text-gray-500 mt-1`.

3. **Summary Section (4 Columns)**:
   - **TOTAL DISTANCE**: `totalKm` KM, subtext: `${runs.length} runs`
   - **TOTAL TIME**: `totalHours` H, subtext: `${avgWeeklyKm} km/wk`
   - **AVERAGE PACE**: `avgPace` /KM, subtext: `${avgHeartRate} bpm`
   - **LONGEST RUN**: `maxDistStr` KM, subtext: `${maxCount} runs`
   - *Style*: Use `text-primary` (white) for these values.

4. **Personal Bests Section (4 Columns)**:
   - Add a calculation for Half Marathon: `const pbHalf = getPB(21097.5);`
   - Format the dates to match the image (e.g., "May 20, 2024").
   - **FASTEST 5K**: `pb5.time`, subtext: formatted date
   - **FASTEST 10K**: `pb10.time`, subtext: formatted date
   - **FASTEST 15K**: `pb15.time`, subtext: formatted date
   - **HALF MARATHON**: `pbHalf.time`, subtext: formatted date
   - *Style*: Use `text-accent` (orange, `#FF3B30`) for these values to make them pop like the image.

5. **Language**:
   - Ensure all text labels and placeholders strictly use English.

## Assumptions & Decisions
- The user confirmed that both sections should use the "Big Numbers" layout and icons should be placed next to the section titles.
- The values in the "PERSONAL BESTS" section will be colored orange (`text-accent`) to match the image, while "SUMMARY" values will remain white (`text-primary`) for contrast.
- The primary value for the PB stats will be the *time* instead of the *pace* to accurately match the image's "4:12" and "22:45" examples.

## Verification Steps
1. Verify the component renders two separate cards for Summary and Personal Bests.
2. Ensure the layout matches the 4-column big numbers design and is center-aligned.
3. Check that PB dates are correctly formatted (e.g., "May 20, 2024").
4. Confirm that all text is in English and the values use the correct colors (`text-primary` and `text-accent`).