import { useMemo, useState, useRef } from 'react';
import ActivityIcon from '@/components/ActivityIcon';
import {
  Activity,
  Coordinate,
  convertMovingTime2Sec,
  formatPace,
  groupRunsByDate,
  HIKE_TYPE,
  pathForRun,
  RUN_TYPE,
  sortDateFunc,
  WALK_TYPE,
} from '@/utils/utils';

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

const formatDuration = (seconds: number) => {
  if (!seconds) return '0m';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
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

const ActivityPopover = ({
  title,
  run,
  totalDistanceKm,
  totalSeconds,
  children,
  className = '',
}: {
  title: string;
  run: Activity;
  totalDistanceKm?: number;
  totalSeconds?: number;
  children: React.ReactNode;
  className?: string;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [posClass, setPosClass] = useState('left-1/2 -translate-x-1/2');

  const updatePosition = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const screenW = window.innerWidth;
    const POPOVER_WIDTH = 224; // w-56 is 14rem = 224px

    if (rect.left < POPOVER_WIDTH / 2) {
      setPosClass('left-0');
    } else if (screenW - rect.right < POPOVER_WIDTH / 2) {
      setPosClass('right-0');
    } else {
      setPosClass('left-1/2 -translate-x-1/2');
    }
  };

  const handleMouseEnter = () => updatePosition();
  const handleTouchStart = () => updatePosition();
  const handleClick = () => updatePosition();

  const distanceKm = totalDistanceKm ?? run.distance / 1000;
  const seconds = totalSeconds ?? convertMovingTime2Sec(run.moving_time);
  const paceText =
    distanceKm > 0
      ? formatPace((distanceKm * 1000) / Math.max(1, seconds))
      : '-';

  return (
    <div
      ref={containerRef}
      className={`group relative ${className}`}
      onMouseEnter={handleMouseEnter}
      onTouchStart={handleTouchStart}
      onClick={handleClick}
    >
      {children}
      <div
        className={`pointer-events-none absolute z-50 top-full mt-2 w-[220px] 
        rounded-xl border border-white/10 bg-gray-900/95 backdrop-blur-md p-3 
        shadow-2xl shadow-black/50 transition-all duration-200 ease-out 
        opacity-0 translate-y-1 scale-95 group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100 ${posClass}`}
      >
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
          <span className="font-bold text-white text-xs tracking-wide">
            {title}
          </span>
          <span className="text-[10px] text-gray-400 font-medium px-1.5 py-0.5 rounded bg-white/5 border border-white/5">
            {run.type}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-y-3 gap-x-2">
          <div>
            <div className="text-[10px] text-gray-500 font-bold tracking-wider uppercase mb-0.5">
              KM
            </div>
            <div className="text-lg font-bold text-white tabular-nums leading-none">
              {distanceKm.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-gray-500 font-bold tracking-wider uppercase mb-0.5">
              Pace
            </div>
            <div className="text-lg font-bold text-blue-400 tabular-nums leading-none">
              {paceText}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-gray-500 font-bold tracking-wider uppercase mb-0.5">
              Time
            </div>
            <div className="text-lg font-bold text-white tabular-nums leading-none">
              {formatDuration(seconds)}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-gray-500 font-bold tracking-wider uppercase mb-0.5">
              BPM
            </div>
            <div className="text-lg font-bold text-red-500 tabular-nums leading-none">
              {run.average_heartrate?.toFixed(0) || '--'}
            </div>
          </div>
        </div>

        {run.name && (
          <div className="mt-3 pt-2 border-t border-white/10 text-[10px] text-gray-400 truncate font-medium flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-emerald-500/80 shrink-0" />
            <span className="truncate">{run.name}</span>
          </div>
        )}
      </div>
    </div>
  );
};

interface RunningChartsProps {
  year: string;
  runs: Activity[];
}

const RunningCharts = ({ year, runs }: RunningChartsProps) => {
  const [selectedType, setSelectedType] = useState(RUN_TYPE);

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
        const paceText =
          distanceKm > 0
            ? formatPace((distanceKm * 1000) / Math.max(1, seconds))
            : '-';
        return { r, distanceKm, seconds, points, date, paceText };
      })
      .filter((v) => !!v);
  }, [runs, selectedType]);

  const yearRuns = useMemo(() => {
    if (year === 'Total') return [];
    return runs.filter((run) => run.start_date_local?.slice(0, 4) === year);
  }, [runs, year]);

  const runsByDate = useMemo(() => groupRunsByDate(yearRuns), [yearRuns]);

  if (year === 'Total') {
    return (
      <div className="w-full rounded-card border border-gray-800/50 bg-card p-2 sm:p-4 lg:p-5 overflow-hidden sm:overflow-visible">
        <div className="flex items-center justify-end mb-3">
          <div className="flex items-center border border-gray-800/50">
            <button
              type="button"
              onClick={() => setSelectedType(RUN_TYPE)}
              className={`p-1.5 rounded-md transition ${
                selectedType === RUN_TYPE
                  ? 'bg-gray-800 text-primary'
                  : 'text-secondary hover:bg-gray-800/60 hover:text-primary'
              }`}
            >
              <ActivityIcon type={RUN_TYPE} />
            </button>
            <button
              type="button"
              onClick={() => setSelectedType(HIKE_TYPE)}
              className={`p-1.5 rounded-md transition ${
                selectedType === HIKE_TYPE
                  ? 'bg-gray-800 text-primary'
                  : 'text-secondary hover:bg-gray-800/60 hover:text-primary'
              }`}
            >
              <ActivityIcon type={HIKE_TYPE} />
            </button>
            <button
              type="button"
              onClick={() => setSelectedType(WALK_TYPE)}
              className={`p-1.5 rounded-md transition ${
                selectedType === WALK_TYPE
                  ? 'bg-gray-800 text-primary'
                  : 'text-secondary hover:bg-gray-800/60 hover:text-primary'
              }`}
            >
              <ActivityIcon type={WALK_TYPE} />
            </button>
          </div>
        </div>

        {totalPolylines.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {totalPolylines.map(({ r, distanceKm, points, date }) => (
              <ActivityPopover
                key={r.run_id}
                title={date}
                run={r}
              >
                <div
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
              </ActivityPopover>
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
            <div key={monthLabel} className="grid grid-cols-[32px_1fr] sm:grid-cols-[54px_1fr] gap-2 sm:gap-3">
              <div className="pt-1 text-[10px] sm:text-[11px] text-secondary font-semibold select-none">
                {monthLabel}
              </div>
              <div className="grid grid-cols-7 gap-0.5 sm:gap-1.5">
                {cells.map((day, cellIndex) => {
                  if (!day) {
                    return (
                      <div
                        key={`${monthLabel}-empty-${cellIndex}`}
                        className="aspect-square"
                      />
                    );
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
                    outdoorRuns.sort((a, b) => b.distance - a.distance)[0] ||
                    dayRuns[0];
                  const points = primaryRun
                    ? computePolylinePoints(pathForRun(primaryRun))
                    : '';
                  const paceText =
                    totalDistanceKm > 0
                      ? formatPace(
                          (totalDistanceKm * 1000) / Math.max(1, totalSeconds)
                        )
                      : '-';

                  return (
                    <div key={key}>
                       {dayRuns.length > 0 ? (
                         <ActivityPopover
                          title={key}
                          run={primaryRun || dayRuns[0]}
                          totalDistanceKm={totalDistanceKm}
                          totalSeconds={totalSeconds}
                        >
                           <div
                             className={`aspect-square flex items-center justify-center transition ${
                               dayRuns.length > 0
                                 ? pickCellBgColor(totalDistanceKm)
                                 : 'bg-gray-900/20'
                             }`}
                           >
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
                        </ActivityPopover>
                      ) : (
                        <div
                          className={`aspect-square flex items-center justify-center transition bg-gray-900/20`}
                        >
                          <span className="text-[10px] text-secondary tabular-nums">
                            {day}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RunningCharts;
