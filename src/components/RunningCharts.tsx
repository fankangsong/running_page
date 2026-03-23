import { useMemo } from 'react';
import ActivityIcon from '@/components/ActivityIcon';
import {
  Activity,
  Coordinate,
  convertMovingTime2Sec,
  groupRunsByDate,
  HIKE_TYPE,
  pathForRun,
  RUN_TYPE,
  sortDateFunc,
  WALK_TYPE,
} from '@/utils/utils';
import {
  ActivityPopoverProvider,
  ActivityPopover,
  useHoverActivity,
  ActivityData,
} from '@/components/ActivityPopover';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = [
  'Jan.',
  'Feb.',
  'Mar.',
  'Apr.',
  'May.',
  'Jun.',
  'Jul.',
  'Aug.',
  'Sep.',
  'Oct.',
  'Nov.',
  'Dec.',
];

const pad2 = (n: number) => String(n).padStart(2, '0');
const dateKey = (year: string, month: number, day: number) =>
  `${year}-${pad2(month)}-${pad2(day)}`;

const computePolylinePoints = (
  coordinates: Coordinate[],
  size = 28,
  padding = 3
) => {
  if (coordinates.length < 2) return '';
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  coordinates.forEach(([x, y]) => {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  });
  const dx = Math.max(1e-9, maxX - minX);
  const dy = Math.max(1e-9, maxY - minY);
  const scale = (size - padding * 2) / Math.max(dx, dy);
  return coordinates
    .map(([x, y]) => {
      const nx = (x - minX) * scale + padding;
      const ny = (maxY - y) * scale + padding;
      return `${nx.toFixed(1)},${ny.toFixed(1)}`;
    })
    .join(' ');
};

const pickStrokeColor = (distanceKm: number) => {
  if (distanceKm <= 5) return 'text-sky-400';
  if (distanceKm <= 10) return 'text-emerald-400';
  if (distanceKm <= 15) return 'text-amber-400';
  return 'text-rose-400';
};

const pickCellBgColor = (distanceKm: number) => {
  if (distanceKm <= 5) return 'bg-sky-500/10 hover:bg-sky-500/15';
  if (distanceKm <= 10) return 'bg-emerald-500/10 hover:bg-emerald-500/15';
  if (distanceKm <= 15) return 'bg-amber-500/10 hover:bg-amber-500/15';
  return 'bg-rose-500/10 hover:bg-rose-500/15';
};

interface TotalRunItemProps {
  r: Activity;
  distanceKm: number;
  points: string;
  date: string;
}

const TotalRunItem = ({ r, distanceKm, points, date }: TotalRunItemProps) => {
  const activityData: ActivityData = useMemo(
    () => ({
      title: date,
      run: r,
      totalDistanceKm: distanceKm,
      totalSeconds: convertMovingTime2Sec(r.moving_time),
    }),
    [r, distanceKm, date]
  );

  const { onMouseEnter, onMouseLeave } = useHoverActivity(activityData);

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="w-11 h-11 flex items-center justify-center transition "
    >
      <svg
        viewBox="0 0 28 28"
        className={`w-[90%] h-[90%] ${pickStrokeColor(distanceKm)}`}
      >
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth="0.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

interface PBMap {
  best5k?: Activity;
  best10k?: Activity;
  bestHalf?: Activity;
  bestFull?: Activity;
  longest?: Activity;
}

const getBestRun = (runs: Activity[], minDist: number, maxDist: number) => {
  const candidates = runs.filter(
    (r) => r.distance / 1000 >= minDist && r.distance / 1000 <= maxDist
  );
  if (candidates.length === 0) return undefined;
  // Sort by average speed (fastest first)
  return candidates.sort((a, b) => b.average_speed - a.average_speed)[0];
};

const getLongestRun = (runs: Activity[]) => {
  if (runs.length === 0) return undefined;
  return runs.sort((a, b) => b.distance - a.distance)[0];
};

// Material Icons for PB
const PBIcon = ({ icon, color }: { icon: string; color: string }) => (
  <div
    className={`absolute -top-1.5 -right-1.5 z-10 flex h-4 w-4 items-center justify-center rounded-full ${color} ring-1 ring-gray-900 shadow-sm`}
  >
    <span
      className="material-icons text-white leading-none"
      style={{ fontSize: '10px' }}
    >
      {icon}
    </span>
  </div>
);

interface DayCellProps {
  day: number | null;
  year: string;
  month: number;
  runsByDate: Record<string, Activity[]>;
  pbMap: PBMap;
}

const DayCell = ({ day, year, month, runsByDate, pbMap }: DayCellProps) => {
  if (!day) {
    return <div className="aspect-square" />;
  }

  const key = dateKey(year, month, day);
  const dayRuns = runsByDate[key] ?? [];

  const totalDistanceKm =
    dayRuns.reduce((sum, run) => sum + run.distance, 0) / 1000;
  const totalSeconds = dayRuns.reduce(
    (sum, run) => sum + convertMovingTime2Sec(run.moving_time),
    0
  );
  const outdoorRuns = dayRuns.filter((r) => !!r.summary_polyline);
  const primaryRun =
    outdoorRuns.sort((a, b) => b.distance - a.distance)[0] || dayRuns[0];
  const points = primaryRun
    ? computePolylinePoints(pathForRun(primaryRun))
    : '';

  // Check for PB
  let pbIcon = null;
  let pbColor = '';
  let achievement = undefined;

  if (primaryRun) {
    if (primaryRun.run_id === pbMap.best5k?.run_id) {
      pbIcon = 'emoji_events';
      pbColor = 'bg-emerald-500';
      achievement = {
        label: '5k',
        description: 'Best 5K of the Year',
        icon: 'emoji_events',
        colorClass: 'text-emerald-400',
      };
    } else if (primaryRun.run_id === pbMap.best10k?.run_id) {
      pbIcon = 'emoji_events';
      pbColor = 'bg-blue-500';
      achievement = {
        label: '10k',
        description: 'Best 10K of the Year',
        icon: 'emoji_events',
        colorClass: 'text-blue-400',
      };
    } else if (primaryRun.run_id === pbMap.bestHalf?.run_id) {
      pbIcon = 'emoji_events';
      pbColor = 'bg-purple-500';
      achievement = {
        label: 'Half',
        description: 'Best Half Marathon of the Year',
        icon: 'emoji_events',
        colorClass: 'text-purple-400',
      };
    } else if (primaryRun.run_id === pbMap.bestFull?.run_id) {
      pbIcon = 'emoji_events';
      pbColor = 'bg-rose-500';
      achievement = {
        label: 'Full',
        description: 'Best Marathon of the Year',
        icon: 'emoji_events',
        colorClass: 'text-rose-400',
      };
    } else if (primaryRun.run_id === pbMap.longest?.run_id) {
      // Only show longest if not already a PB
      pbIcon = 'flag';
      pbColor = 'bg-amber-500';
      achievement = {
        label: 'Longest',
        description: 'Longest Run of the Year',
        icon: 'flag',
        colorClass: 'text-amber-400',
      };
    }
  }

  const activityData: ActivityData | null = useMemo(() => {
    if (dayRuns.length === 0) return null;
    return {
      title: key,
      run: primaryRun,
      totalDistanceKm,
      totalSeconds,
      achievement,
    };
  }, [dayRuns, key, primaryRun, totalDistanceKm, totalSeconds, achievement]);

  const { onMouseEnter, onMouseLeave } = useHoverActivity(activityData);

  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="relative"
    >
      {dayRuns.length > 0 ? (
        <div
          className={`aspect-square flex items-center justify-center transition relative ${
            dayRuns.length > 0
              ? pickCellBgColor(totalDistanceKm)
              : 'bg-gray-900/20'
          }`}
        >
          {pbIcon && <PBIcon icon={pbIcon} color={pbColor} />}
          {points ? (
            <svg
              viewBox="0 0 28 28"
              className={`w-[90%] h-[90%] ${pickStrokeColor(totalDistanceKm)}`}
            >
              <polyline
                points={points}
                fill="none"
                stroke="currentColor"
                strokeWidth="0.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <span className="text-[10px] text-secondary tabular-nums">
              {day}
            </span>
          )}
        </div>
      ) : (
        <div
          className={`aspect-square flex items-center justify-center transition bg-gray-900/20`}
        >
          <span className="text-[10px] text-secondary tabular-nums">{day}</span>
        </div>
      )}
    </div>
  );
};

interface RunningChartsProps {
  year: string;
  runs: Activity[];
  selectedType: string;
  onSelectType: (_type: string) => void;
}

const RunningChartsContent = ({
  year,
  runs,
  selectedType,
  onSelectType,
}: RunningChartsProps) => {
  const totalPolylines = useMemo(() => {
    const filtered = [...runs]
      .filter((r) => r.type === selectedType)
      .sort(sortDateFunc);
    return filtered
      .map((r) => {
        const distanceKm = r.distance / 1000;
        const seconds = convertMovingTime2Sec(r.moving_time);
        const points = computePolylinePoints(pathForRun(r));
        if (!points) return null;
        const date = r.start_date_local?.slice(0, 10) ?? '';
        return { r, distanceKm, seconds, points, date };
      })
      .filter((v) => !!v);
  }, [runs, selectedType]);

  const yearRuns = useMemo(() => {
    if (year === 'Total') return [];
    return runs.filter(
      (run) =>
        run.start_date_local?.slice(0, 4) === year && run.type === selectedType
    );
  }, [runs, selectedType, year]);

  const runsByDate = useMemo(() => groupRunsByDate(yearRuns), [yearRuns]);

  // Calculate PBs for the current year
  const pbMap: PBMap = useMemo(() => {
    if (year === 'Total' || selectedType !== RUN_TYPE) return {};
    const runActivities = yearRuns.filter((r) => r.type === RUN_TYPE);
    return {
      best5k: getBestRun(runActivities, 5, 5.5),
      best10k: getBestRun(runActivities, 10, 10.5),
      bestHalf: getBestRun(runActivities, 21.0975, 21.5),
      bestFull: getBestRun(runActivities, 42.195, 42.5),
      longest: getLongestRun(runActivities),
    };
  }, [selectedType, yearRuns, year]);

  if (year === 'Total') {
    return (
      <div className="w-full rounded-card border border-gray-800/50 bg-card p-2 sm:p-4 lg:p-5 overflow-hidden sm:overflow-visible">
        <div className="flex items-center justify-end mb-3">
          <div className="flex items-center bg-gray-900/50 border border-white/10 rounded-lg backdrop-blur-sm overflow-hidden">
            <button
              type="button"
              onClick={() => onSelectType(RUN_TYPE)}
              className={`p-2 transition-all duration-200 relative ${
                selectedType === RUN_TYPE
                  ? 'bg-gray-700/80 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
              title="Run"
            >
              <ActivityIcon type={RUN_TYPE} />
            </button>
            <button
              type="button"
              onClick={() => onSelectType(HIKE_TYPE)}
              className={`p-2 transition-all duration-200 relative ${
                selectedType === HIKE_TYPE
                  ? 'bg-gray-700/80 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
              title="Hike"
            >
              <ActivityIcon type={HIKE_TYPE} />
            </button>
            <button
              type="button"
              onClick={() => onSelectType(WALK_TYPE)}
              className={`p-2 transition-all duration-200 relative ${
                selectedType === WALK_TYPE
                  ? 'bg-gray-700/80 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
              title="Walk"
            >
              <ActivityIcon type={WALK_TYPE} />
            </button>
          </div>
        </div>

        {totalPolylines.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {totalPolylines.map(({ r, distanceKm, points, date }) => (
              <TotalRunItem
                key={r.run_id}
                r={r}
                distanceKm={distanceKm}
                points={points}
                date={date}
              />
            ))}
          </div>
        ) : (
          <div className="py-10 text-center text-secondary text-sm">
            No activities with map data.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full rounded-card border border-gray-800/50 bg-card p-2 sm:p-4 lg:p-5 overflow-hidden sm:overflow-visible">
      <div className="flex items-center justify-end mb-3">
        <div className="flex items-center bg-gray-900/50 border border-white/10 rounded-lg backdrop-blur-sm overflow-hidden">
          <button
            type="button"
            onClick={() => onSelectType(RUN_TYPE)}
            className={`p-2 transition-all duration-200 relative ${
              selectedType === RUN_TYPE
                ? 'bg-gray-700/80 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
            title="Run"
          >
            <ActivityIcon type={RUN_TYPE} />
          </button>
          <button
            type="button"
            onClick={() => onSelectType(HIKE_TYPE)}
            className={`p-2 transition-all duration-200 relative ${
              selectedType === HIKE_TYPE
                ? 'bg-gray-700/80 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
            title="Hike"
          >
            <ActivityIcon type={HIKE_TYPE} />
          </button>
          <button
            type="button"
            onClick={() => onSelectType(WALK_TYPE)}
            className={`p-2 transition-all duration-200 relative ${
              selectedType === WALK_TYPE
                ? 'bg-gray-700/80 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
            title="Walk"
          >
            <ActivityIcon type={WALK_TYPE} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-[32px_1fr] sm:grid-cols-[54px_1fr] gap-2 sm:gap-3 mb-3">
        <div />
        <div className="grid grid-cols-7 gap-0.5 sm:gap-1.5">
          {WEEKDAYS.map((label, idx) => (
            <div
              key={`${label}-${idx}`}
              className="text-[10px] font-bold text-secondary text-center select-none"
            >
              {label}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2.5">
        {MONTHS.map((monthLabel, monthIndex) => {
          const month = monthIndex + 1;
          const firstDay = new Date(Number(year), month - 1, 1).getDay();
          const daysInMonth = new Date(Number(year), month, 0).getDate();
          const cells: Array<number | null> = [];
          for (let i = 0; i < firstDay; i += 1) cells.push(null);
          for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
          while (cells.length % 7 !== 0) cells.push(null);

          return (
            <div
              key={monthLabel}
              className="grid grid-cols-[32px_1fr] sm:grid-cols-[54px_1fr] gap-2 sm:gap-3"
            >
              <div className="pt-1 text-[10px] sm:text-[11px] text-secondary font-semibold select-none">
                {monthLabel}
              </div>
              <div className="grid grid-cols-7 gap-0.5 sm:gap-1.5">
                {cells.map((day, cellIndex) => (
                  <DayCell
                    key={`${monthLabel}-${cellIndex}`}
                    day={day}
                    year={year}
                    month={month}
                    runsByDate={runsByDate}
                    pbMap={pbMap}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const RunningCharts = (props: RunningChartsProps) => (
  <ActivityPopoverProvider>
    <RunningChartsContent {...props} />
    <ActivityPopover />
  </ActivityPopoverProvider>
);

export default RunningCharts;
