# Add Info Popover to RunMap

The goal is to display detailed run information in a popover at the bottom of the `RunMap` component, matching the content and style of the `CompactRunCalendar` popover.

## Steps

1.  **Extract Reusable Components/Utilities**:
    -   `IndoorRunIcon` is defined in `CompactRunCalendar/index.tsx`. We should move it to a shared location or duplicate it if simple enough. Given it's small, we can duplicate it or move it to `src/utils/utils.tsx` (if exists) or create a new component. Let's create `src/components/RunInfoCard.tsx` to encapsulate the info display logic, which can be reused or just used in `RunMap`. Wait, `CompactRunCalendar` uses it inside a map loop.
    -   Actually, to keep it simple and consistent, we can just implement the same UI logic in `RunMap`.

2.  **Pass Current Run Data to RunMap**:
    -   `RunMap` needs to know which run is currently being displayed or highlighted.
    -   Currently `RunMap` receives `geoData`. If `isSingleRun` is true, we have a single run.
    -   However, `geoData` (GeoJSON) properties might not contain all the `Activity` fields needed (like `average_heartrate`, `moving_time`, `type` etc.).
    -   Check `geoJsonForRuns` in `src/utils/utils.ts`. It maps `runs` to features.
    -   We need to verify if `geoJsonForRuns` puts `Activity` data into `properties`.
    -   Checking `src/utils/utils.ts`:
        ```typescript
        const geoJsonForRuns = (runs: Activity[]): FeatureCollection<LineString> => ({
          type: 'FeatureCollection',
          features: runs.map((run) => {
            const points = pathForRun(run);
            return {
              type: 'Feature',
              properties: {}, // Empty properties!
              geometry: { ... },
            };
          }),
        });
        ```
    -   **Problem**: `geoData` doesn't have the run metadata.
    -   **Solution**: Update `geoJsonForRuns` in `src/utils/utils.ts` to include `run` object in `properties`.

3.  **Update `src/utils/utils.ts`**:
    -   Modify `geoJsonForRuns` to pass `run` data into `properties`.

4.  **Update `src/components/RunMap/index.tsx`**:
    -   Read the run data from `geoData.features[0].properties` when `isSingleRun` is true.
    -   Import `IndoorRunIcon` logic (or define it locally).
    -   Import `formatPace`, `convertMovingTime2Sec`, `pad2` (helper).
    -   Render the info card at the bottom of the map container when `isSingleRun` is true.

## Implementation Details

-   **Modify `src/utils/utils.ts`**:
    -   Update `geoJsonForRuns` to: `properties: run`.

-   **Modify `src/components/RunMap/index.tsx`**:
    -   Add imports: `formatPace`, `convertMovingTime2Sec`, `Activity`, `RUN_TYPE` etc.
    -   Define `IndoorRunIcon` (copy from Calendar).
    -   Extract run data from `geoData.features[0].properties`.
    -   Calculate display values (Distance, Pace, Heart Rate, Time Range).
    -   Render the card absolute positioned at bottom center.

## Verification

-   Click on a run in the calendar (which triggers `locateActivity` -> sets `geoData` with single run).
-   Verify the map shows the run path AND the new info popover at the bottom.
-   Verify the content matches the calendar popover.
