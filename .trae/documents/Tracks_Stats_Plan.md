# Plan: Add Stats to Tracks Page & Update Title

This plan addresses the user's request to add statistical metrics to the Tracks page (similar to the reference image) and change the page title to "我的轨迹".

## 1. Create `TracksStats` Component (`src/components/TracksStats.tsx`)
-   **Objective**: Create a new component to display run statistics for a selected year or all time.
-   **Props**:
    -   `runs`: Array of `Activity` objects (filtered by year).
    -   `year`: String (e.g., '2026' or 'Total').
-   **Logic**:
    -   Calculate `totalDistance` (sum of `run.distance`).
    -   Calculate `totalRuns` (length of `runs`).
    -   Calculate `avgPace` (total time / total distance).
    -   Calculate `maxStreak` (max of `run.streak`).
    -   Calculate `avgHeartRate` (average of `run.average_heartrate`).
-   **Styling**:
    -   Use a vertical layout.
    -   Large, bold, italic, yellow/gold text for numbers (e.g., `text-5xl font-bold text-yellow-300 italic`).
    -   Smaller, normal weight, yellow/gold text for labels (e.g., `text-xl text-yellow-300 font-medium`).
    -   Match the reference image: "Year Journey", "Runs", "KM", "Avg Pace", "day Streak", "Avg Heart Rate".

## 2. Update `Tracks` Page (`src/pages/Tracks.tsx`)
-   **Objective**: Integrate `TracksStats` and update page title.
-   **Actions**:
    -   Import `TracksStats`, `filterAndSortRuns`, `filterYearRuns`, `sortDateFunc`.
    -   Change the `<h1>` title from "10KM Tracks" to "我的轨迹".
    -   Add logic to filter runs based on the selected `year` (using `filterAndSortRuns`).
    -   Update the layout to display `TracksStats` and `TracksGrid` side-by-side on large screens (using Flexbox):
        -   Left column (approx 25%): `TracksStats`.
        -   Right column (approx 75%): `TracksGrid`.
        -   Stack them on smaller screens.
    -   Ensure the Year Selector remains at the top.

## 3. Verification
-   Verify the page title is "我的轨迹".
-   Verify the stats update when switching years.
-   Verify the layout matches the reference (stats on the left/top, grid on the right/bottom).
-   Check calculations for correctness (e.g., total distance matches other stats).
