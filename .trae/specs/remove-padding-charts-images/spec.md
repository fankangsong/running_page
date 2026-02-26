# Remove Padding from Chart and Image Containers Spec

## Why
The user requested that charts and images with outer containers should not have inner padding, likely to achieve a full-bleed visual effect or to maximize the display area for visual content like maps and charts.

## What Changes
- Remove `p-6` class from the `div` container wrapping `RunMap` in `src/pages/index.tsx`.
- Remove `p-6` class from the `div` container wrapping `AnnualStatsChart` in `src/pages/index.tsx`.
- Remove `bg-gray-800` from `AnnualStatsChart` component to allow the container's background to show through (or ensure consistency).

## Impact
- **Visuals**: Maps and charts will extend to the edges of their container cards.
- **Affected Files**:
    - `src/pages/index.tsx`
    - `src/components/AnnualStatsChart/index.tsx`

## ADDED Requirements
### Requirement: Full-bleed Map and Chart
The `RunMap` and `AnnualStatsChart` components SHALL occupy the full width and height of their card containers without any padding.

#### Scenario: Success case
- **WHEN** the dashboard loads
- **THEN** the Map card and the Annual Stats Chart card show content touching the borders (no padding).

## MODIFIED Requirements
### Requirement: Card Container Styling
- **Previous**: Containers had `p-6`.
- **New**: Containers for Map and Annual Stats Chart have `p-0` (or simply remove `p-6`).
