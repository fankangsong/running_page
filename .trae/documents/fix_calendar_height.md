# Fix Calendar Height Jitter

The goal is to fix the UI jitter in the `CompactRunCalendar` component caused by varying heights when switching months (different number of weeks). We will achieve this by fixing the number of rows displayed in the calendar to 6 (42 cells).

## Steps

1.  **Modify `src/components/CompactRunCalendar/index.tsx`**:
    -   Update the `cells` `useMemo` logic.
    -   Ensure the returned array always has a length of 42 (6 rows * 7 columns).
    -   After filling the days of the month and the initial padding, continue filling with empty cells until the total count reaches 42.

## Verification

-   Switch between months with 4, 5, and 6 weeks (e.g., Feb 2026 vs months starting on Saturday/Sunday).
-   Confirm the container height remains constant.
