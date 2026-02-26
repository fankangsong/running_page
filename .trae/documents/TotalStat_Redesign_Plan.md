# Plan: Redesign TotalStat Component

## 1. Analysis
The user wants to redesign `src/components/DashboardStats/TotalStat.tsx` based on a reference image, adopting its fields and layout structure (Summary, Avg, Max/Min groups) while maintaining the project's existing visual style (colors, fonts).

### New Data Requirements:
- **Total Hours**: Calculate from `run.moving_time`.
- **Avg Weekly KM**: Calculate total weeks spanned and divide total distance.
- **Max Run Distance**: Identify the longest run.
- **Min Run Distance**: Identify the shortest run.

### Existing Data:
- Total Distance
- Total Runs
- Avg Pace
- Avg Heart Rate

## 2. Implementation Steps

### Step 1: Update `TotalStat.tsx`
- **Import**: Ensure `convertMovingTime2Sec` and `formatPace` are imported from `@/utils/utils`.
- **Logic**:
    - Iterate through `activities` to calculate:
        - `sumDistance` (Total KM).
        - `totalSeconds` (Total Hours).
        - `heartRateSum` / `count` (Avg HR).
        - `pace` metrics (Avg Pace).
        - `maxDistance` and `minDistance`.
        - `minTime` and `maxTime` (to calculate date range for Weekly Avg).
- **Layout**:
    - Create a root container with a grid layout.
    - Define 3 columns/groups:
        1.  **SUMMARY**: Distance, Runs, Hours.
        2.  **AVG**: Pace, Heart Rate, Weekly KM.
        3.  **MAX/MIN**: Max Distance, Min Distance.
    - Use responsive grid (`grid-cols-1 md:grid-cols-3`) to adapt to the container width.
- **Styling**:
    - Use the project's standard typography:
        - Group Headers: `text-xs font-bold text-gray-500 tracking-widest uppercase`.
        - Values: `text-2xl font-black text-white` (or `text-3xl` for emphasis).
        - Units/Labels: `text-xs font-bold text-gray-500 uppercase`.

## 3. Verification
- Verify that all new metrics are calculated correctly.
- Check that the layout respects the 3-group structure.
- Ensure the style matches the dark theme of the application.
