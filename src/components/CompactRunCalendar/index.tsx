import { useMemo, useState } from 'react';
import {
  Activity,
  Coordinate,
  formatPace,
  convertMovingTime2Sec,
  pathForRun,
} from '@/utils/utils';
import ActivityIcon from '@/components/ActivityIcon';

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

const pad2 = (n: number) => String(n).padStart(2, '0');

const monthLabel = (month: number) => pad2(month);

const dayKey = (year: string, month: number, day: number) =>
  `${year}-${pad2(month)}-${pad2(day)}`;

const pickOutdoorRun = (runs: Activity[]) => {
  const outdoor = runs.filter((r) => !!r.summary_polyline);
  if (!outdoor.length) return null;
  return outdoor.reduce(
    (best, r) => (r.distance > best.distance ? r : best),
    outdoor[0]
  );
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
}

const CompactRunCalendar = ({
  year,
  month,
  years,
  runsByDate,
  onChangeYearMonth,
  onSelectRunIds,
}: CompactRunCalendarProps) => {
  const [selectedKey, setSelectedKey] = useState<string>('');
  const [animKey, setAnimKey] = useState(0);

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

  const handleSelectDay = (day: number) => {
    const key = dayKey(year, month, day);
    setSelectedKey(key);
    const dayRuns = runsByDate[key] ?? [];
    if (!dayRuns.length) return;
    onSelectRunIds?.(dayRuns.map((r) => r.run_id));
  };

  return (
    <div className="bg-card rounded-card shadow-lg border border-gray-800/50 p-3">
      <div className="flex items-center justify-between mb-2">
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
        className="grid grid-cols-7 gap-1 animate-[fadeIn_0.3s_ease-out]"
      >
        {cells.map((c, i) => {
          if (!c.inMonth) {
            return <div key={`e-${i}`} className="w-full aspect-square" />;
          }

          const key = dayKey(year, month, c.day);
          const dayRuns = runsByDate[key] ?? [];
          // If multiple runs, prefer outdoor run for polyline
          const outdoorRun = pickOutdoorRun(dayRuns);
          // Prefer run with polyline, then any run
          const primaryRun = outdoorRun || dayRuns[0];

          const hasIndoor = dayRuns.some((r) => !r.summary_polyline);
          const polylineSvgPoints = outdoorRun
            ? computePolylinePoints(pathForRun(outdoorRun), 36, 4)
            : '';

          const isSelected = selectedKey === key;
          const isClickable = dayRuns.length > 0;
          const hasVisual = Boolean(polylineSvgPoints) || !!primaryRun;

          const displayRun = dayRuns.length
            ? [...dayRuns].sort(
                (a, b) =>
                  new Date(b.start_date_local.replace(' ', 'T')).getTime() -
                  new Date(a.start_date_local.replace(' ', 'T')).getTime()
              )[0]
            : null;
          const displayDistance = displayRun
            ? (displayRun.distance / 1000).toFixed(2)
            : '';
          const displayPace = displayRun?.average_speed
            ? formatPace(displayRun.average_speed)
            : '--';
          const displayHr = displayRun?.average_heartrate
            ? displayRun.average_heartrate.toFixed(0)
            : '--';
          const displayTitle = displayRun?.name || 'Run';

          let timeRange = '';
          let displayDuration = '';
          if (displayRun) {
            const durationTotalSeconds = convertMovingTime2Sec(
              displayRun.moving_time
            );
            const hours = Math.floor(durationTotalSeconds / 3600);
            const minutes = Math.floor((durationTotalSeconds % 3600) / 60);
            const seconds = Math.floor(durationTotalSeconds % 60);
            displayDuration = `${hours}:${pad2(minutes)}:${pad2(seconds)}`;

            const startTime = displayRun.start_date_local.split(' ')[1];
            if (startTime) {
              const [h, m, s] = startTime.split(':').map(Number);
              const startDate = new Date();
              startDate.setHours(h, m, s);
              const endDate = new Date(
                startDate.getTime() + durationTotalSeconds * 1000
              );
              const endTime = endDate.toTimeString().split(' ')[0];
              timeRange = `${startTime}~${endTime}`;
            }
          }

          return (
            <div key={key} className="relative group">
              <button
                type="button"
                onClick={() => handleSelectDay(c.day)}
                className={`w-full aspect-square rounded-md relative overflow-hidden flex items-stretch justify-stretch transition ${
                  isSelected
                    ? 'bg-gray-700 shadow-inner'
                    : isClickable
                    ? 'bg-gray-900/30 hover:bg-gray-800/40'
                    : 'bg-transparent'
                }`}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  {polylineSvgPoints ? (
                    <svg
                      viewBox="0 0 36 36"
                      className="w-[28px] h-[28px] text-accent"
                    >
                      <polyline
                        points={polylineSvgPoints}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity="0.95"
                      />
                    </svg>
                  ) : primaryRun ? (
                    <div className="text-yellow-400">
                      <ActivityIcon size={22} type={primaryRun.type} />
                    </div>
                  ) : null}
                </div>

                {!hasVisual ? (
                  <div className="absolute inset-0 flex items-center justify-center text-[11px] leading-none tabular-nums font-bold text-secondary">
                    {c.day}
                  </div>
                ) : null}

                {polylineSvgPoints && hasIndoor ? (
                  <div className="absolute bottom-0.5 left-0.5 text-yellow-400 opacity-90">
                    <ActivityIcon size={22} type={primaryRun?.type} />
                  </div>
                ) : null}
              </button>

              {isClickable ? (
                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-20 pointer-events-none opacity-0 scale-95 translate-y-2 group-hover:opacity-100 group-hover:scale-100 group-hover:translate-y-0 transition duration-150">
                  <div className="bg-gray-900/95 border border-gray-700/70 rounded-lg shadow-xl px-3 py-2.5 w-64">
                    <div className="flex flex-col gap-0.5 mb-2">
                      <div className="flex items-center gap-1.5 text-[12px] text-primary font-bold truncate">
                        <div className="shrink-0">
                          <ActivityIcon size={16} type={displayRun?.type} />
                        </div>
                        <span className="truncate">{displayTitle}</span>
                      </div>
                      <div className="text-[10px] text-gray-400 font-mono pl-5">
                        {timeRange}
                      </div>
                    </div>
                    <div className="flex justify-between items-end gap-2">
                      <div>
                        <div className="text-[10px] text-blue-400 font-bold tracking-[0.6px] uppercase">
                          KM
                        </div>
                        <div className="text-[14px] font-bold text-primary tabular-nums text-[yellow]">
                          {displayDistance}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-purple-400 font-bold tracking-[0.6px] uppercase">
                          Time
                        </div>
                        <div className="text-[14px] font-bold text-primary tabular-nums text-white">
                          {displayDuration}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-emerald-400 font-bold tracking-[0.6px] uppercase">
                          Pace
                        </div>
                        <div className="text-[14px] font-bold text-primary tabular-nums text-[#81d4fa]">
                          {displayPace}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-red-400 font-bold tracking-[0.6px] uppercase">
                          BPM
                        </div>
                        <div className="text-[14px] font-bold text-primary tabular-nums text-[red]">
                          {displayHr}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CompactRunCalendar;
