# Plan: Refactor TotalStat Component

## 1. Objective
Refactor `src/components/DashboardStats/TotalStat.tsx` to strictly match the fields and layout order of the provided reference image, while adhering to the project's existing code style and visual design (Tailwind CSS, dark theme).

## 2. Requirements

### Fields & Data Sources
We need to calculate and display the following metrics, grouped exactly as requested:

**Group 1: SUMMARY**
1.  **Total Distance (KM)**: Sum of all run distances.
2.  **Total Runs**: Count of runs.
3.  **Total Hours**: Sum of `moving_time` converted to hours.

**Group 2: AVG**
1.  **Avg Pace**: Weighted average pace (Total Time / Total Distance).
2.  **Avg Heart Rate**: Average of `average_heartrate`.
3.  **Avg Weekly KM**: Total Distance / Number of weeks in the activity range.

**Group 3: MAX/MIN**
1.  **Max Distance (KM)**: The single longest run distance.
2.  **Min Distance (KM)**: The single shortest run distance.

### Layout & Style
- **Structure**: 3-Column Layout (Summary, Avg, Max/Min).
- **Responsive**: Stack columns on smaller screens, horizontal on larger screens.
- **Visual Style**:
    - **Background**: Transparent (container handles background).
    - **Typography**:
        - Group Titles: Small, uppercase, bold, gray (e.g., `text-xs font-bold text-gray-500 uppercase`).
        - Values: Large, bold, white (e.g., `text-3xl font-black text-white`).
        - Units/Labels: Small, uppercase, gray, aligned with the baseline or bottom of the value.
    - **Alignment**: Left-aligned for text/numbers within columns.

## 3. Implementation Plan

### Step 1: Data Calculation Logic
- Import `useActivities` hook.
- Import `formatPace` and `convertMovingTime2Sec` from utils.
- Iterate through activities to compute:
    - Sums: Distance, Time, Heart Rate.
    - Ranges: Min/Max Date (for weeks calculation), Min/Max Distance.
- Format results:
    - Distance: fixed to 1 decimal place.
    - Hours: fixed to 2 decimal places.
    - Pace: standard `mm'ss"` format.
    - HR: integer.
    - Weekly KM: fixed to 1 decimal place.

### Step 2: Component Structure
- **Container**: `grid grid-cols-1 md:grid-cols-3 gap-8`.
- **Columns**: Three `div`s, one for each group.
- **Rows**: Flex containers for each metric `(Value + Unit)`.

### Step 3: Coding
- Write the component in `TotalStat.tsx`, completely replacing the existing content.
- Ensure strict type safety and handle edge cases (e.g., no runs, missing HR data).

## 4. Verification
- Verify all 8 fields are present.
- Verify the layout order: Summary -> Avg -> Max/Min.
- Verify styling matches the dark theme.
