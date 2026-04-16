import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Activity,
  Coordinate,
  convertMovingTime2Sec,
  formatPace,
  pathForRun,
  RUN_TYPE,
  sortDateFunc,
  scrollToMap,
} from '@/utils/utils';
import ActivityIcon from '@/components/ActivityIcon';

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

const pad2 = (n: number) => String(n).padStart(2, '0');

const monthLabel = (month: number) => pad2(month);

const dayKey = (year: string, month: number, day: number) =>
  `${year}-${pad2(month)}-${pad2(day)}`;

const WALK_LIKE_TYPES = new Set(['Hike', 'Walk']);

const ACTIVITY_TYPE_DISPLAY_NAMES: Record<string, string> = {
  Run: 'Running',
  Walk: 'Walking',
  Hike: 'Hiking',
  Ride: 'Cycling',
  VirtualRide: 'Virtual Cycling',
  EBikeRide: 'E-Bike Cycling',
  Swim: 'Swimming',
  Workout: 'Workout',
};

const getDisplayType = (type: string) => ACTIVITY_TYPE_DISPLAY_NAMES[type] || type;

const getSwitchableRuns = (runs: Activity[]) => {
  const polylineRuns = runs.filter((r) => !!r.summary_polyline);
  if (polylineRuns.length < 2) return [];
  const typeSet = new Set(polylineRuns.map((r) => r.type));
  if (typeSet.size < 2) return [];
  return [...polylineRuns].sort(sortDateFunc);
};

const displayPriorityForActivity = (run: Activity) => {
  const hasPolyline = !!run.summary_polyline;
  if (run.type === RUN_TYPE && hasPolyline) return 0;
  if (WALK_LIKE_TYPES.has(run.type) && hasPolyline) return 1;
  if (run.type === RUN_TYPE && !hasPolyline) return 2;
  if (hasPolyline) return 3;
  return 4;
};

const sortActivitiesByDisplayPriority = (runs: Activity[]) =>
  [...runs].sort((a, b) => {
    const priorityDiff =
      displayPriorityForActivity(a) - displayPriorityForActivity(b);
    if (priorityDiff !== 0) return priorityDiff;
    if (b.distance !== a.distance) return b.distance - a.distance;
    return sortDateFunc(a, b);
  });

const pickDefaultRun = (runs: Activity[]) => {
  if (!runs.length) return undefined;
  return sortActivitiesByDisplayPriority(runs)[0];
};

const computePolylinePoints = (
  coordinates: Coordinate[],
  size = 36,
  padding = 4
) => {
  if (coordinates.length < 2) return '';

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  coordinates.forEach((p) => {
    const x = p[0];
    const y = p[1];
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  });

  const dx = Math.max(1e-9, maxX - minX);
  const dy = Math.max(1e-9, maxY - minY);
  const scale = (size - padding * 2) / Math.max(dx, dy);

  return coordinates
    .map((p) => {
      const x = (p[0] - minX) * scale + padding;
      const y = (maxY - p[1]) * scale + padding;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
};

const typeStrokeClass = (type: string) => {
  if (type === RUN_TYPE) return 'text-emerald-400';
  if (type === 'Hike') return 'text-amber-400';
  if (type === 'Walk') return 'text-sky-400';
  if (type === 'Ride' || type === 'VirtualRide' || type === 'EBikeRide') {
    return 'text-violet-400';
  }
  return 'text-gray-300';
};

const typeTextClass = (type: string) => {
  if (type === RUN_TYPE) return 'text-emerald-300';
  if (type === 'Hike') return 'text-amber-300';
  if (type === 'Walk') return 'text-sky-300';
  if (type === 'Ride' || type === 'VirtualRide' || type === 'EBikeRide') {
    return 'text-violet-300';
  }
  return 'text-gray-200';
};

// eslint-disable-next-line no-unused-vars
const formatDuration = (seconds: number) => {
  if (!seconds) return '0m';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

interface TypeGroupedRuns {
  type: string;
  runs: Activity[];
  totalDistanceKm: number;
  totalSeconds: number;
  paceText: string;
  avgHeartrate: number | null;
  hasPolyline: boolean;
}

const buildTypeGroupedRuns = (runs: Activity[]): TypeGroupedRuns[] => {
  const grouped = new Map<string, Activity[]>();
  runs.forEach((run) => {
    const prev = grouped.get(run.type) ?? [];
    prev.push(run);
    grouped.set(run.type, prev);
  });

  const summaries = [...grouped.entries()].map(([type, typeRuns]) => {
    const totalDistanceKm =
      typeRuns.reduce((sum, run) => sum + run.distance, 0) / 1000;
    const totalSeconds = typeRuns.reduce(
      (sum, run) => sum + convertMovingTime2Sec(run.moving_time),
      0
    );
    const paceText =
      totalDistanceKm > 0
        ? formatPace((totalDistanceKm * 1000) / Math.max(1, totalSeconds))
        : '-';

    let heartrateSum = 0;
    let heartrateSeconds = 0;
    typeRuns.forEach((run) => {
      const heartrate = run.average_heartrate;
      if (typeof heartrate === 'number' && Number.isFinite(heartrate)) {
        const seconds = Math.max(1, convertMovingTime2Sec(run.moving_time));
        heartrateSum += heartrate * seconds;
        heartrateSeconds += seconds;
      }
    });
    const avgHeartrate =
      heartrateSeconds > 0 ? heartrateSum / heartrateSeconds : null;
    const hasPolyline = typeRuns.some((run) => !!run.summary_polyline);

    return {
      type,
      runs: sortActivitiesByDisplayPriority(typeRuns),
      totalDistanceKm,
      totalSeconds,
      paceText,
      avgHeartrate,
      hasPolyline,
    };
  });

  return summaries.sort((a, b) => {
    const mockA = {
      type: a.type,
      summary_polyline: a.hasPolyline,
    } as Activity;
    const mockB = {
      type: b.type,
      summary_polyline: b.hasPolyline,
    } as Activity;
    const priorityDiff =
      displayPriorityForActivity(mockA) - displayPriorityForActivity(mockB);
    if (priorityDiff !== 0) return priorityDiff;
    return b.totalDistanceKm - a.totalDistanceKm;
  });
};

const ArrowIcon = ({ dir }: { dir: 'left' | 'right' }) => (
  <svg
    viewBox="0 0 24 24"
    width="16"
    height="16"
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {dir === 'left' ? (
      <>
        <polyline points="15 18 9 12 15 6" />
      </>
    ) : (
      <>
        <polyline points="9 18 15 12 9 6" />
      </>
    )}
  </svg>
);

interface CompactRunCalendarProps {
  year: string;
  month: number;
  years: string[];
  runsByDate: Record<string, Activity[]>;
  onChangeYearMonth: (_year: string, _month: number) => void;
  onSelectRunIds?: (_runIds: number[]) => void;
  selectedDate?: string;
}

const CompactRunCalendar = ({
  year,
  month,
  years,
  runsByDate,
  onChangeYearMonth,
  onSelectRunIds,
  selectedDate,
}: CompactRunCalendarProps) => {
  const [selectedKey, setSelectedKey] = useState<string>(selectedDate || '');
  const [animKey, setAnimKey] = useState(0);
  const [hoveredKey, setHoveredKey] = useState('');
  const [popoverPos, setPopoverPos] = useState<{
    left: number;
    top: number;
    placement: 'top' | 'bottom';
  } | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cellRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const popoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (selectedDate) {
      setSelectedKey(selectedDate);
    }
  }, [selectedDate]);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
    };
  }, []);

  const triggerAnim = () => {
    setAnimKey((prev) => prev + 1);
  };

  const yearIndex = useMemo(
    () => years.findIndex((y) => y === year),
    [year, years]
  );

  const olderYear = useMemo(() => {
    if (!years.length) return year;
    const idx = yearIndex >= 0 ? yearIndex : 0;
    return years[(idx + 1) % years.length];
  }, [year, yearIndex, years]);

  const newerYear = useMemo(() => {
    if (!years.length) return year;
    const idx = yearIndex >= 0 ? yearIndex : 0;
    return years[(idx - 1 + years.length) % years.length];
  }, [year, yearIndex, years]);

  const firstDayOffset = useMemo(() => {
    const d = new Date(Number(year), month - 1, 1);
    const js = d.getDay();
    const mondayBased = (js + 6) % 7;
    return mondayBased;
  }, [month, year]);

  const daysInMonth = useMemo(() => {
    return new Date(Number(year), month, 0).getDate();
  }, [month, year]);

  const cells = useMemo(() => {
    const arr: Array<{ day: number; inMonth: boolean }> = [];
    for (let i = 0; i < firstDayOffset; i += 1) {
      arr.push({ day: 0, inMonth: false });
    }
    for (let d = 1; d <= daysInMonth; d += 1) {
      arr.push({ day: d, inMonth: true });
    }
    // Always fill to 42 cells (6 rows * 7 columns) to maintain consistent height
    const totalCells = 42;
    while (arr.length < totalCells) {
      arr.push({ day: 0, inMonth: false });
    }
    return arr;
  }, [daysInMonth, firstDayOffset]);

  const hoveredRuns = hoveredKey ? runsByDate[hoveredKey] ?? [] : [];
  const hoveredTypeGroups = useMemo(
    () => buildTypeGroupedRuns(hoveredRuns),
    [hoveredRuns]
  );

  const hidePopover = useCallback(() => {
    setHoveredKey('');
    setPopoverPos(null);
  }, []);

  const scheduleHidePopover = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    hideTimerRef.current = setTimeout(() => {
      hidePopover();
    }, 140);
  }, [hidePopover]);

  const syncPopoverPosition = useCallback((key: string) => {
    const anchor = cellRefs.current[key];
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const width = popoverRef.current?.offsetWidth ?? 260;
    const height = popoverRef.current?.offsetHeight ?? 150;
    const viewportPadding = 8;

    let left = rect.left + rect.width / 2 - width / 2;
    left = Math.max(
      viewportPadding,
      Math.min(left, window.innerWidth - width - viewportPadding)
    );

    let top = rect.bottom + 8;
    let placement: 'top' | 'bottom' = 'bottom';
    if (top + height > window.innerHeight - viewportPadding) {
      top = Math.max(viewportPadding, rect.top - height - 8);
      placement = 'top';
    }
    setPopoverPos({ left, top, placement });
  }, []);

  const showPopover = useCallback(
    (key: string) => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
      }
      setHoveredKey(key);
      syncPopoverPosition(key);
    },
    [syncPopoverPosition]
  );

  useEffect(() => {
    if (!hoveredKey) return;
    syncPopoverPosition(hoveredKey);
    const onViewportChange = () => syncPopoverPosition(hoveredKey);
    window.addEventListener('resize', onViewportChange);
    window.addEventListener('scroll', onViewportChange, true);
    return () => {
      window.removeEventListener('resize', onViewportChange);
      window.removeEventListener('scroll', onViewportChange, true);
    };
  }, [hoveredKey, syncPopoverPosition]);

  const handlePrevYear = () => {
    onChangeYearMonth(olderYear, month);
    setSelectedKey('');
    triggerAnim();
  };

  const handleNextYear = () => {
    onChangeYearMonth(newerYear, month);
    setSelectedKey('');
    triggerAnim();
  };

  const handlePrevMonth = () => {
    triggerAnim();
    if (month > 1) {
      onChangeYearMonth(year, month - 1);
      setSelectedKey('');
      return;
    }
    onChangeYearMonth(olderYear, 12);
    setSelectedKey('');
  };

  const handleNextMonth = () => {
    triggerAnim();
    if (month < 12) {
      onChangeYearMonth(year, month + 1);
      setSelectedKey('');
      return;
    }
    onChangeYearMonth(newerYear, 1);
    setSelectedKey('');
  };

  const handleSelectRunTypeGroup = (key: string, groupedRuns: Activity[]) => {
    setSelectedKey(key);
    onSelectRunIds?.(groupedRuns.map((run) => run.run_id));
    scrollToMap();
    hidePopover();
  };

  const handleSelectDay = (day: number, disableMapUpdate: boolean) => {
    const key = dayKey(year, month, day);
    setSelectedKey(key);
    const dayRuns = runsByDate[key] ?? [];
    if (!dayRuns.length) return;
    if (disableMapUpdate) return;
    onSelectRunIds?.(dayRuns.map((r) => r.run_id));
    scrollToMap();
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center justify-between mb-2 shrink-0">
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Prev year"
            className="w-7 h-7 rounded-md bg-gray-800/60 text-secondary hover:text-primary hover:bg-gray-700/70 active:scale-95 transition"
            onClick={handlePrevYear}
          >
            <span className="flex items-center justify-center">
              <ArrowIcon dir="left" />
            </span>
          </button>
          <div className="text-sm font-bold tabular-nums text-primary">
            {year}
          </div>
          <button
            type="button"
            aria-label="Next year"
            className="w-7 h-7 rounded-md bg-gray-800/60 text-secondary hover:text-primary hover:bg-gray-700/70 active:scale-95 transition"
            onClick={handleNextYear}
          >
            <span className="flex items-center justify-center">
              <ArrowIcon dir="right" />
            </span>
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Prev month"
            className="w-7 h-7 rounded-md bg-gray-800/60 text-secondary hover:text-primary hover:bg-gray-700/70 active:scale-95 transition"
            onClick={handlePrevMonth}
          >
            <span className="flex items-center justify-center">
              <ArrowIcon dir="left" />
            </span>
          </button>
          <div className="text-sm font-bold tabular-nums text-primary">
            {monthLabel(month)}
          </div>
          <button
            type="button"
            aria-label="Next month"
            className="w-7 h-7 rounded-md bg-gray-800/60 text-secondary hover:text-primary hover:bg-gray-700/70 active:scale-95 transition"
            onClick={handleNextMonth}
          >
            <span className="flex items-center justify-center">
              <ArrowIcon dir="right" />
            </span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="text-center text-[10px] font-bold text-secondary select-none"
          >
            {w}
          </div>
        ))}
      </div>

      <div
        key={animKey}
        className="grid grid-cols-7 gap-1 flex-grow animate-[fadeIn_0.3s_ease-out]"
      >
        {cells.map((c, i) => {
          if (!c.inMonth) {
            return <div key={`e-${i}`} className="w-full aspect-square min-h-0" />;
          }

          const key = dayKey(year, month, c.day);
          const dayRuns = runsByDate[key] ?? [];
          const switchableRuns = getSwitchableRuns(dayRuns);
          const isMultiSportSwitchable = switchableRuns.length > 0;
          const hasMultiActivities = dayRuns.length > 1;
          const defaultRun = pickDefaultRun(dayRuns);
          const primaryRun = defaultRun || dayRuns[0];

          const primaryPolylinePoints =
            primaryRun && primaryRun.summary_polyline
              ? computePolylinePoints(pathForRun(primaryRun), 36, 4)
              : '';

          const isSelected = selectedKey === key;
          const isClickable = dayRuns.length > 0;
          const hasVisual = Boolean(primaryPolylinePoints) || !!primaryRun;

          return (
            <div
              key={key}
              className="relative"
              ref={(node) => {
                cellRefs.current[key] = node;
              }}
              onMouseEnter={() => {
                if (hasMultiActivities) {
                  showPopover(key);
                }
              }}
              onMouseLeave={scheduleHidePopover}
            >
              <button
                type="button"
                onClick={() => handleSelectDay(c.day, isMultiSportSwitchable)}
                className={`w-full aspect-square min-h-0 rounded-md relative overflow-hidden flex items-stretch justify-stretch transition ${
                  isSelected
                    ? 'bg-gray-700 shadow-inner'
                    : isClickable
                    ? 'bg-gray-900/30 hover:bg-gray-800/40'
                    : 'bg-transparent'
                }`}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  {primaryPolylinePoints ? (
                    <svg
                      viewBox="0 0 36 36"
                      className={`w-[28px] h-[28px] ${typeStrokeClass(primaryRun?.type || '')}`}
                    >
                      <polyline
                        points={primaryPolylinePoints}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity="0.95"
                      />
                    </svg>
                  ) : primaryRun ? (
                    <div className={typeStrokeClass(primaryRun.type)}>
                      <ActivityIcon size={22} type={primaryRun.type} />
                    </div>
                  ) : null}
                </div>

                {!hasVisual ? (
                  <div className="absolute inset-0 flex items-center justify-center text-[11px] leading-none tabular-nums font-bold text-secondary">
                    {c.day}
                  </div>
                ) : null}

              </button>
            </div>
          );
        })}
      </div>
      {hoveredKey && popoverPos
        ? createPortal(
            <div
              ref={popoverRef}
              style={{
                left: `${popoverPos.left}px`,
                top: `${popoverPos.top}px`,
              }}
              className={`fixed z-[70] w-[200px] rounded-xl border border-gray-700/80 bg-gray-900/95 p-2 shadow-2xl backdrop-blur-md animate-[fadeIn_0.2s_ease-out] ${
                popoverPos.placement === 'bottom'
                  ? 'origin-top'
                  : 'origin-bottom'
              }`}
              onMouseEnter={() => {
                if (hideTimerRef.current) {
                  clearTimeout(hideTimerRef.current);
                }
              }}
              onMouseLeave={scheduleHidePopover}
            >
              <div className="flex flex-col gap-1">
                {hoveredTypeGroups.map((group) => (
                  <button
                    key={`${hoveredKey}-${group.type}`}
                    type="button"
                    onClick={() => handleSelectRunTypeGroup(hoveredKey, group.runs)}
                    className="rounded-lg border border-transparent bg-gray-900/20 px-2 py-1.5 text-left transition hover:border-gray-700/80 hover:bg-gray-800/70"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <ActivityIcon size={20} type={group.type} />
                        <span
                          className={`truncate text-[12px] font-semibold ${typeTextClass(group.type)}`}
                        >
                          {getDisplayType(group.type)}
                        </span>
                      </span>
                      <span
                        className={`tabular-nums text-sm font-bold ${typeStrokeClass(group.type)}`}
                      >
                        {group.totalDistanceKm.toFixed(1)} KM
                      </span>
                    </div>
                    {/* <div className="mt-0.5 pl-5 text-[10px] tabular-nums text-gray-400">
                      {group.paceText} · {formatDuration(group.totalSeconds)} ·{' '}
                      {group.avgHeartrate
                        ? `${group.avgHeartrate.toFixed(0)}bpm`
                        : '--'}
                    </div> */}
                  </button>
                ))}
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
};

export default CompactRunCalendar;
