# Create ActivityCardList Module for Hiking and Cycling

This plan outlines the steps to create a new module `ActivityCardList` that displays Hiking and Cycling activities using a card layout instead of a table.

## Goals
- Filter activities for Hiking and Cycling types.
- Display activities in a grid of cards, sorted by date (newest first).
- Each card shows a 48px 1:1 polyline on the left and data on the right (similar to calendar popover).
- Clicking a card triggers calendar and map updates.

## Steps

1.  **Create `src/components/ActivityCardList/index.tsx`**:
    -   Accept props: `runs` (all activities), `onSelectRun` (callback for interaction).
    -   Filter `runs` to include only Hiking and Cycling types: `HIKE_TYPE`, `RIDE_TYPE`, `VIRTUAL_RIDE_TYPE`, `EBIKE_RIDE_TYPE`.
    -   Sort filtered runs by date descending.
    -   Render a grid layout (e.g., `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`).
    -   Map through filtered runs and render `ActivityCard` component.

2.  **Create `src/components/ActivityCardList/ActivityCard.tsx`**:
    -   Accept `run` (Activity object) and `onClick` handler.
    -   **Layout**: Flex row container.
    -   **Left**: 48x48px container for Polyline. Reuse logic from `RunPolyline` but simplified/scaled for small size, or just use `RunPolyline` with strict sizing. *Note*: `RunPolyline` uses a fixed 300x300 viewBox. We can wrap it in a `div` with `w-12 h-12` (48px).
    -   **Right**: Data display. Reuse the logic/layout from `CompactRunCalendar` popover:
        -   Title row: Icon + Name.
        -   Data row: Distance (KM), Time, Pace, BPM.
    -   **Styling**:
        -   Background: `bg-card` (or slightly lighter/darker for contrast).
        -   Border: `border-gray-800/50`.
        -   Hover effect: `hover:bg-gray-800/50`, cursor pointer.

3.  **Integrate into `src/pages/index.tsx`**:
    -   Import `ActivityCardList`.
    -   Place it below the Map or alongside other components (user didn't specify exact location, but "module" implies a section). Let's place it below the main grid or in a new row.
    -   Pass `activities` and `locateActivity` / `changeYearMonth` handlers.
        -   *Interaction*: "Clicking each card drives calendar and map data linkage."
        -   This means calling `changeYearMonth` (to switch calendar to that run's month) and `locateActivity` (to focus map).
        -   We can reuse the `handleClickPB` logic or similar.

## Implementation Details

### `ActivityCardList/index.tsx`
```typescript
import { Activity, HIKE_TYPE, RIDE_TYPE, VIRTUAL_RIDE_TYPE, EBIKE_RIDE_TYPE } from '@/utils/utils';
import ActivityCard from './ActivityCard';

interface Props {
  activities: Activity[];
  onClick: (run: Activity) => void;
}

const ActivityCardList = ({ activities, onClick }: Props) => {
  const filtered = activities.filter(r => 
    [HIKE_TYPE, RIDE_TYPE, VIRTUAL_RIDE_TYPE, EBIKE_RIDE_TYPE].includes(r.type)
  ).sort((a, b) => new Date(b.start_date_local).getTime() - new Date(a.start_date_local).getTime());

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {filtered.map(run => (
        <ActivityCard key={run.run_id} run={run} onClick={() => onClick(run)} />
      ))}
    </div>
  );
};
```

### `ActivityCardList/ActivityCard.tsx`
- Reuse `IndoorRunIcon` logic (need to export it or duplicate). *Decision*: Duplicate for independence or move to utils. Since it was duplicated in RunMap plan, let's just duplicate it again or finally move it to a shared component if possible. *Action*: Move `IndoorRunIcon` to `src/utils/icons.tsx` or similar if we were refactoring, but for now, to be safe and quick, I'll duplicate the simple icon logic or check if I can export it from `CompactRunCalendar`. `CompactRunCalendar` doesn't export it. I'll duplicate it in `ActivityCard`.
- Use `RunPolyline` for the 48px image. `RunPolyline` takes `run` as prop and renders SVG. I will wrap it: `<div className="w-12 h-12 shrink-0"><RunPolyline run={run} /></div>`.

### Integration in `index.tsx`
- Add `<ActivityCardList activities={activities} onClick={handleClickPB} />`.
- `handleClickPB` (from previous task) handles switching year/month and locating activity. This fits perfectly.

## Verification
- Check if Hiking/Cycling activities appear in the new list.
- Check if layout matches (no card border for module, small cards for items).
- Click a card -> Calendar jumps to date, Map focuses on track.
