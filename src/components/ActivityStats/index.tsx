import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Activity,
  formatPace,
  convertMovingTime2Sec,
  getAerobicZone,
  AEROBIC_ZONES,
  locationForRun,
} from '@/utils/utils';
import CyclingText, { CyclingTextHandle } from '@/components/CyclingText';
import Dropdown from '@/components/Dropdown';

// Helper to format duration in seconds to h:m:s
const formatDuration = (seconds: number) => {
  if (!seconds) return '-';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

// ISO week helpers
const getStartOfWeek = (d: Date) => {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  return date;
};

const getISOWeek = (d: Date) => {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((date.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7
    )
  );
};

interface ActivityStatsProps {
  activities: Activity[];
}

type TimeSpan = 'week' | 'month' | 'year' | 'all';
type Dimension = 'distance' | 'time' | 'count';

const timeSpans: { label: string; value: TimeSpan }[] = [
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
  { label: 'Year', value: 'year' },
  { label: 'All', value: 'all' },
];

const dimensions: { label: string; value: Dimension }[] = [
  { label: 'Distance', value: 'distance' },
  { label: 'Time', value: 'time' },
  { label: 'Runs', value: 'count' },
];

// Color palette for grouped bar chart (index 0 = main year, 1..3 = compare years)
const YEAR_COLORS: string[] = [
  'from-[#4fc3f7] to-[#81d4fa]', // main year - blue (existing)
  'from-emerald-400 to-emerald-300', // compare - green
  'from-orange-400 to-amber-300', // compare - orange
  'from-violet-400 to-purple-300', // compare - violet
];

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const MAX_COMPARE_YEARS = 3;

const ActivityStats: React.FC<ActivityStatsProps> = ({ activities }) => {
  const [timeSpan, setTimeSpan] = useState<TimeSpan>('month');
  const [dimension, setDimension] = useState<Dimension>('distance');
  const [referenceDate, setReferenceDate] = useState(new Date());
  const [compareYears, setCompareYears] = useState<number[]>([]);
  const [compareDropdownOpen, setCompareDropdownOpen] = useState(false);
  const compareDropdownRef = useRef<HTMLDivElement>(null);

  const handlePrev = () => {
    const d = new Date(referenceDate);
    if (timeSpan === 'week') d.setDate(d.getDate() - 7);
    else if (timeSpan === 'month') d.setMonth(d.getMonth() - 1);
    else if (timeSpan === 'year') d.setFullYear(d.getFullYear() - 1);
    setReferenceDate(d);
  };

  const handleNext = () => {
    const d = new Date(referenceDate);
    if (timeSpan === 'week') d.setDate(d.getDate() + 7);
    else if (timeSpan === 'month') d.setMonth(d.getMonth() + 1);
    else if (timeSpan === 'year') d.setFullYear(d.getFullYear() + 1);
    setReferenceDate(d);
  };

  // Available years for comparison: all years from activities, excluding the main year
  const mainYear = referenceDate.getFullYear();
  const availableYears = useMemo(() => {
    const yrsSet = new Set<number>();
    activities.forEach((a) => {
      const y = new Date(a.start_date_local.replace(' ', 'T')).getFullYear();
      if (!isNaN(y)) yrsSet.add(y);
    });
    return Array.from(yrsSet)
      .filter((y) => y !== mainYear)
      .sort((a, b) => b - a);
  }, [activities, mainYear]);

  // Auto-remove compare years that equal the main year (when navigating)
  useEffect(() => {
    setCompareYears((prev) => {
      const filtered = prev.filter((y) => y !== mainYear);
      return filtered.length !== prev.length ? filtered : prev;
    });
  }, [mainYear]);

  // Close compare dropdown on outside click
  useEffect(() => {
    if (!compareDropdownOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        compareDropdownRef.current &&
        !compareDropdownRef.current.contains(event.target as Node)
      ) {
        setCompareDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [compareDropdownOpen]);

  const toggleCompareYear = (year: number) => {
    setCompareYears((prev) => {
      if (prev.includes(year)) {
        return prev.filter((y) => y !== year);
      }
      if (prev.length >= MAX_COMPARE_YEARS) return prev;
      return [...prev, year].sort((a, b) => b - a);
    });
  };

  // 1. Filter activities based on timeSpan and referenceDate
  const filteredActivities = useMemo(() => {
    if (timeSpan === 'all') return activities;

    const refYear = referenceDate.getFullYear();
    const refMonth = referenceDate.getMonth();

    if (timeSpan === 'year') {
      return activities.filter(
        (a) =>
          new Date(a.start_date_local.replace(' ', 'T')).getFullYear() ===
          refYear
      );
    }

    if (timeSpan === 'month') {
      return activities.filter((a) => {
        const d = new Date(a.start_date_local.replace(' ', 'T'));
        return d.getFullYear() === refYear && d.getMonth() === refMonth;
      });
    }

    if (timeSpan === 'week') {
      const start = getStartOfWeek(referenceDate);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      return activities.filter((a) => {
        const d = new Date(a.start_date_local.replace(' ', 'T'));
        return d >= start && d < end;
      });
    }

    return [];
  }, [activities, timeSpan, referenceDate]);

  // 2. Calculate metrics
  const metrics = useMemo(() => {
    let totalDist = 0;
    let totalTime = 0;
    let count = filteredActivities.length;
    let maxSpeed = 0;
    let sumSpeed = 0;
    let sumHR = 0;
    let countHR = 0;

    filteredActivities.forEach((a) => {
      totalDist += a.distance / 1000;
      totalTime += convertMovingTime2Sec(a.moving_time);
      if (a.average_speed > maxSpeed) maxSpeed = a.average_speed;
      sumSpeed += a.average_speed;
      if (a.average_heartrate) {
        sumHR += a.average_heartrate;
        countHR++;
      }
    });

    const avgSpeed = count > 0 ? sumSpeed / count : 0;
    const avgHR = countHR > 0 ? Math.round(sumHR / countHR) : null;
    const aerobicZone = getAerobicZone(avgHR);

    return {
      totalDist,
      totalTime,
      count,
      avgPace: avgSpeed > 0 ? formatPace(avgSpeed) : '-',
      maxPace: maxSpeed > 0 ? formatPace(maxSpeed) : '-',
      avgHR: avgHR ? avgHR.toString() : '-',
      aerobicZoneText: aerobicZone ? `Z${aerobicZone.zone}` : '-',
      aerobicZoneColor: aerobicZone ? aerobicZone.color : 'inherit',
    };
  }, [filteredActivities]);

  // 2.5 Calculate location stats (countries and cities)
  const locationStats = useMemo(() => {
    const countries = new Set<string>();
    const cities = new Set<string>();

    filteredActivities.forEach((a) => {
      const location = locationForRun(a);
      if (location.country) countries.add(location.country);
      if (location.city) cities.add(location.city);
    });

    return {
      countryCount: countries.size,
      cityCount: cities.size,
    };
  }, [filteredActivities]);

  // 3. Prepare chart data
  const chartData = useMemo(() => {
    let data: { label: string; value: number }[] = [];

    if (timeSpan === 'week') {
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      data = days.map((d) => ({ label: d, value: 0 }));
      filteredActivities.forEach((a) => {
        const d = new Date(a.start_date_local.replace(' ', 'T'));
        const day = d.getDay();
        const idx = day === 0 ? 6 : day - 1;
        if (dimension === 'distance') data[idx].value += a.distance / 1000;
        else if (dimension === 'time')
          data[idx].value += convertMovingTime2Sec(a.moving_time) / 60;
        // minutes
        else data[idx].value += 1;
      });
    } else if (timeSpan === 'month') {
      const daysInMonth = new Date(
        referenceDate.getFullYear(),
        referenceDate.getMonth() + 1,
        0
      ).getDate();
      data = Array.from({ length: daysInMonth }, (_, i) => ({
        label: `${i + 1}`,
        value: 0,
      }));
      filteredActivities.forEach((a) => {
        const d = new Date(a.start_date_local.replace(' ', 'T'));
        const idx = d.getDate() - 1;
        if (dimension === 'distance') data[idx].value += a.distance / 1000;
        else if (dimension === 'time')
          data[idx].value += convertMovingTime2Sec(a.moving_time) / 60;
        else data[idx].value += 1;
      });
    } else if (timeSpan === 'year') {
      const months = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];
      data = months.map((m) => ({ label: m, value: 0 }));
      filteredActivities.forEach((a) => {
        const d = new Date(a.start_date_local.replace(' ', 'T'));
        const idx = d.getMonth();
        if (dimension === 'distance') data[idx].value += a.distance / 1000;
        else if (dimension === 'time')
          data[idx].value += convertMovingTime2Sec(a.moving_time) / 60;
        else data[idx].value += 1;
      });
    } else {
      // All - group by year
      const yearMap = new Map<number, number>();
      activities.forEach((a) => {
        const y = new Date(a.start_date_local.replace(' ', 'T')).getFullYear();
        let val = 0;
        if (dimension === 'distance') val = a.distance / 1000;
        else if (dimension === 'time')
          val = convertMovingTime2Sec(a.moving_time) / 60;
        else val = 1;
        yearMap.set(y, (yearMap.get(y) || 0) + val);
      });
      const sortedYears = Array.from(yearMap.keys()).sort();
      data = sortedYears.map((y) => ({
        label: `${y}`,
        value: yearMap.get(y) || 0,
      }));
    }

    return data;
  }, [filteredActivities, activities, timeSpan, dimension, referenceDate]);

  // 4. Calculate Aerobic Zone distribution data based on selected dimension
  const zoneDistribution = useMemo(() => {
    const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    filteredActivities.forEach((a) => {
      const hr = a.average_heartrate;
      if (!hr) return;
      const zone = getAerobicZone(hr);
      if (!zone) return;

      if (dimension === 'distance') {
        dist[zone.zone] += a.distance / 1000;
      } else if (dimension === 'time') {
        dist[zone.zone] += convertMovingTime2Sec(a.moving_time); // seconds
      } else if (dimension === 'count') {
        dist[zone.zone] += 1;
      }
    });
    return dist;
  }, [filteredActivities, dimension]);

  const maxZoneValue = Math.max(...Object.values(zoneDistribution), 0);

  const maxValue = Math.max(...chartData.map((d) => d.value), 1); // Avoid div by 0

  // 3.5 Multi-series chart data for year comparison (grouped bar chart)
  // Returns null unless in Year view with at least one compare year selected.
  const comparisonChartData = useMemo(() => {
    if (timeSpan !== 'year' || compareYears.length === 0) return null;

    const years = [mainYear, ...compareYears].sort((a, b) => b - a);
    const yearIndex = new Map<number, number>();
    years.forEach((y, i) => yearIndex.set(y, i));

    // bars[monthIndex] = number[] indexed by year position
    const bars: number[][] = Array.from({ length: 12 }, () =>
      new Array(years.length).fill(0)
    );

    activities.forEach((a) => {
      const d = new Date(a.start_date_local.replace(' ', 'T'));
      const y = d.getFullYear();
      const idx = yearIndex.get(y);
      if (idx === undefined) return;
      const m = d.getMonth();
      let val = 0;
      if (dimension === 'distance') val = a.distance / 1000;
      else if (dimension === 'time')
        val = convertMovingTime2Sec(a.moving_time) / 60;
      else val = 1;
      bars[m][idx] += val;
    });

    const data = MONTH_LABELS.map((label, m) => ({
      label,
      bars: bars[m],
    }));

    return { data, years };
  }, [activities, timeSpan, dimension, compareYears, mainYear]);

  const comparisonMaxValue = useMemo(() => {
    if (!comparisonChartData) return 1;
    const all = comparisonChartData.data.flatMap((d) => d.bars);
    return Math.max(...all, 1);
  }, [comparisonChartData]);

  // Detect mobile screen size
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Determine which labels to show on mobile for month view
  const shouldShowLabel = (index: number, dataLength: number) => {
    if (!isMobile || timeSpan !== 'month') return true;

    // Show label for: 1st (index 0), 15th (index 14), last day
    const firstDay = index === 0;
    const midMonth = index === 14; // 15th day
    const lastDay = index === dataLength - 1;

    return firstDay || midMonth || lastDay;
  };

  // Title formatting
  let title = '';
  if (timeSpan === 'week') {
    title = `${referenceDate.getFullYear()} Week ${getISOWeek(referenceDate)}`;
  } else if (timeSpan === 'month') {
    const monthName = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ][referenceDate.getMonth()];
    title = `${referenceDate.getFullYear()} ${monthName}`;
  } else if (timeSpan === 'year') {
    title = `${referenceDate.getFullYear()}`;
  } else {
    title = 'All Time';
  }

  return (
    <div className="relative w-full bg-card rounded-card shadow-lg border border-gray-800/50 p-6 md:p-8 overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-8">
          <svg
            viewBox="0 0 24 24"
            className="w-6 h-6 text-purple-400"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <h2 className="text-xl md:text-2xl font-black italic uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">
            ACTIVITY TRENDS
          </h2>
        </div>

        {/* Top Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-6">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2 justify-start">
          {timeSpans.map((t) => (
            <button
              key={t.value}
              onClick={() => setTimeSpan(t.value)}
              type="button"
              className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all duration-200 active:scale-95 ${
                timeSpan === t.value
                  ? 'bg-accent text-white shadow-md shadow-accent/20'
                  : 'bg-gray-800 text-secondary hover:bg-gray-700 hover:text-primary'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Navigation & Title - centered on mobile, left-aligned on desktop */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
          {timeSpan !== 'all' && (
            <button
              onClick={handlePrev}
              className="p-1.5 hover:bg-gray-800 rounded-full text-secondary hover:text-primary transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          )}
          <span className="text-sm font-bold text-primary min-w-[120px] text-center tracking-wide">
            {title}
          </span>
          {timeSpan !== 'all' && (
            <button
              onClick={handleNext}
              className="p-1.5 hover:bg-gray-800 rounded-full text-secondary hover:text-primary transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          )}

          {/* Compare Years Select - only in Year view, merged with title group.
              On mobile it wraps to a new line below the navigation. */}
          {timeSpan === 'year' && (
            <div className="relative w-full sm:w-40" ref={compareDropdownRef}>
              <button
                type="button"
                onClick={() => setCompareDropdownOpen((o) => !o)}
                className="flex items-center justify-between w-full px-4 py-2 text-xs font-medium text-primary bg-card border border-gray-800 rounded-md shadow-sm hover:bg-gray-800 focus:outline-none transition-colors"
              >
                <span className="truncate">
                  {compareYears.length === 0
                    ? 'Compare Years'
                    : `Compare: ${compareYears.join(', ')}`}
                </span>
                <svg
                  className={`w-4 h-4 ml-2 text-secondary shrink-0 transition-transform duration-200 ${
                    compareDropdownOpen ? 'rotate-180' : ''
                  }`}
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {compareDropdownOpen && (
                <div className="absolute right-0 z-20 w-full mt-2 origin-top-right bg-card rounded-md shadow-lg ring-1 ring-gray-800 focus:outline-none max-h-60 overflow-y-auto custom-scrollbar">
                  <div className="py-1" role="menu" aria-orientation="vertical">
                    {availableYears.length === 0 && (
                      <span className="block px-4 py-2 text-xs text-secondary">
                        No other years
                      </span>
                    )}
                    {availableYears.map((y) => {
                      const selected = compareYears.includes(y);
                      const disabled =
                        !selected && compareYears.length >= MAX_COMPARE_YEARS;
                      return (
                        <button
                          key={y}
                          type="button"
                          disabled={disabled}
                          onClick={() => toggleCompareYear(y)}
                          className={`flex items-center gap-2 block w-full px-4 py-2 text-sm text-left transition-colors ${
                            disabled
                              ? 'text-gray-600 cursor-not-allowed'
                              : selected
                                ? 'bg-gray-800 text-primary font-bold'
                                : 'text-secondary hover:bg-gray-800 hover:text-primary'
                          }`}
                          role="menuitem"
                        >
                          <span
                            className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 ${
                              selected
                                ? 'bg-accent border-accent'
                                : 'border-gray-600'
                            }`}
                          >
                            {selected && (
                              <svg
                                className="w-2.5 h-2.5 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={3}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            )}
                          </span>
                          {y}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Dimension Select */}
        <Dropdown
          options={dimensions}
          value={dimension}
          onChange={(val) => setDimension(val as Dimension)}
          className="w-32"
        />
      </div>

      {/* Legend - only for grouped bar chart */}
      {comparisonChartData && (
        <div className="flex items-center justify-center gap-4 flex-wrap mb-3">
          {comparisonChartData.years.map((y, i) => (
            <div key={y} className="flex items-center gap-1.5">
              <span
                className={`w-3 h-3 rounded-sm bg-gradient-to-t ${YEAR_COLORS[i % YEAR_COLORS.length]}`}
              />
              <span
                className={`text-xs ${
                  y === mainYear
                    ? 'text-primary font-bold'
                    : 'text-secondary'
                }`}
              >
                {y}
                {y === mainYear && (
                  <span className="text-[9px] text-gray-500 ml-0.5">
                    (current)
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Chart Area */}
      {comparisonChartData ? (
        // Grouped bar chart (Year view with compare years)
        <div className="h-32 md:h-44 mb-6 flex items-end gap-2 border-b border-gray-800/50">
          {comparisonChartData.data.map((d, i) => {
            const hasAnyValue = d.bars.some((v) => v > 0);
            return (
              <div
                key={i}
                className="flex-1 flex flex-col items-center justify-end h-full group relative min-w-0"
              >
                {/* Tooltip - lists all years for this month */}
                <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 bg-gray-900/95 backdrop-blur-sm border border-white/10 rounded-lg px-2.5 py-1.5 shadow-xl flex flex-col items-start pointer-events-none transition-all duration-200 ease-out z-10 -translate-y-1 group-hover:translate-y-0 min-w-[max-content]">
                  <span className="text-[10px] text-gray-400 font-medium mb-1">
                    {d.label}
                  </span>
                  {comparisonChartData.years.map((y, yi) => {
                    const val = d.bars[yi];
                    return (
                      <div
                        key={y}
                        className="flex items-center gap-1.5 text-xs font-mono"
                      >
                        <span
                          className={`w-2 h-2 rounded-sm bg-gradient-to-t ${YEAR_COLORS[yi % YEAR_COLORS.length]}`}
                        />
                        <span className="text-gray-400">{y}:</span>
                        <span className="text-white font-bold">
                          {dimension === 'time'
                            ? formatDuration(val * 60)
                            : val.toFixed(1)}
                          {dimension === 'distance' && (
                            <span className="text-[8px] text-gray-500 ml-0.5">
                              KM
                            </span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-[4px] border-transparent border-t-gray-900/95" />
                </div>

                <div className="flex-1 w-full flex items-end justify-center gap-0.5 pb-3">
                  {d.bars.map((val, yi) => (
                    <div
                      key={yi}
                      className="flex-1 max-w-[20px] rounded-t origin-bottom transition-[height,transform,filter] duration-500 ease-out group-hover:scale-y-[1.04] bg-gradient-to-t opacity-80 group-hover:opacity-100 group-hover:brightness-110"
                      style={{
                        height: `${(val / comparisonMaxValue) * 100}%`,
                        minHeight: val > 0 ? '3px' : '0',
                      }}
                    >
                      <div
                        className={`w-full h-full rounded-t bg-gradient-to-t ${YEAR_COLORS[yi % YEAR_COLORS.length]}`}
                      />
                    </div>
                  ))}
                </div>

                <div
                  className={`text-[10px] w-full text-center transition-colors group-hover:text-primary ${
                    hasAnyValue ? 'text-gray-500' : 'text-transparent'
                  }`}
                >
                  {d.label}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // Single-series bar chart (default)
        <div className="h-32 md:h-44 mb-6 flex items-end gap-2 border-b border-gray-800/50">
          {chartData.map((d, i) => (
            <div
              key={i}
              className="flex-1 flex flex-col items-center justify-end h-full group relative min-w-0"
            >
              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 bg-gray-900/95 backdrop-blur-sm border border-white/10 rounded-lg px-2.5 py-1.5 shadow-xl flex flex-col items-center pointer-events-none transition-all duration-200 ease-out z-10 -translate-y-1 group-hover:translate-y-0 min-w-[max-content]">
                <span className="text-[10px] text-gray-400 font-medium mb-0.5">
                  {timeSpan === 'month' ? `Day ${d.label}` : d.label}
                </span>
                <span className="text-xs font-mono text-white font-bold">
                  {dimension === 'time'
                    ? formatDuration(d.value * 60)
                    : d.value.toFixed(1)}
                  {dimension === 'distance' && (
                    <span className="text-[8px] text-gray-500 ml-0.5">KM</span>
                  )}
                </span>
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-[4px] border-transparent border-t-gray-900/95" />
              </div>

              <div className="flex-1 w-full flex items-end justify-center pb-3">
                <div
                  className="w-full max-w-[32px] rounded-t origin-bottom transition-[height,transform,filter] duration-500 ease-out group-hover:scale-y-[1.04] bg-gradient-to-t from-[#4fc3f7] to-[#81d4fa] opacity-80 group-hover:opacity-100 group-hover:brightness-110"
                  style={{
                    height: `${(d.value / maxValue) * 100}%`,
                    minHeight: d.value > 0 ? '4px' : '0',
                  }}
                ></div>
              </div>

              <div className={`text-[10px] w-full text-center transition-colors group-hover:text-primary ${
                shouldShowLabel(i, chartData.length) ? 'text-gray-500' : 'text-transparent'
              }`}>
                {shouldShowLabel(i, chartData.length) ? d.label : '·'}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 pt-6 border-t border-gray-800/50">
        <MetricCard
          title="Total Distance"
          value={metrics.totalDist.toFixed(1)}
          unit="KM"
          valueColor="#60a5fa"
        />
        <MetricCard
          title="Total Time"
          value={formatDuration(metrics.totalTime)}
          unit=""
          valueColor="#c084fc"
        />
        <MetricCard
          title="Total Runs"
          value={metrics.count.toString()}
          unit="RUNS"
          valueColor="#fb923c"
        />
        <MetricCard
          title="Avg Pace"
          value={metrics.avgPace}
          unit="/KM"
          valueColor="#34d399"
        />
        <MetricCard
          title="Avg HR"
          value={metrics.avgHR}
          unit="BPM"
          valueColor="#fb7185"
        />
        <MetricCard
          title="Best Pace"
          value={metrics.maxPace}
          unit="/KM"
          valueColor="#facc15"
        />
        <MetricCard
          title="Countries"
          value={locationStats.countryCount.toString()}
          unit="COUNTRIES"
          valueColor="#38bdf8"
        />
        <MetricCard
          title="Cities"
          value={locationStats.cityCount.toString()}
          unit="CITIES"
          valueColor="#a78bfa"
        />

        {/* Graphic Aerobic Zones */}
        <div className="flex flex-col items-start gap-1 col-span-2 md:col-span-2 w-full">
          <div className="flex items-center justify-start gap-2 mb-1 w-full">
            <span className="font-sans text-[10px] md:text-xs font-bold text-secondary uppercase tracking-wider truncate">
              AEROBIC ZONES
            </span>
          </div>
          <div className="grid grid-cols-5 gap-1.5 w-full max-w-[200px] h-full pb-1">
            {AEROBIC_ZONES.map((zone) => {
              const val = zoneDistribution[zone.zone] || 0;
              const isHighlighted = val > 0 && val === maxZoneValue;
              let displayVal = '-';
              if (val > 0) {
                if (dimension === 'time') displayVal = formatDuration(val);
                else if (dimension === 'distance') displayVal = val.toFixed(1);
                else displayVal = val.toString();
              }

              return (
                <div
                  key={zone.zone}
                  className={`rounded-md p-1 text-center transition-all flex flex-col justify-center gap-0.5 ${
                    isHighlighted
                      ? 'border border-white/50 shadow-[0_0_8px_rgba(255,255,255,0.2)] scale-[1.05]'
                      : 'border border-white/5'
                  }`}
                  style={{
                    backgroundColor: zone.color,
                    opacity: val > 0 ? (isHighlighted ? 1 : 0.6) : 0.2,
                  }}
                >
                  <div
                    className={`text-[10px] font-black leading-none ${
                      val > 0 ? 'text-black' : 'text-black/80'
                    }`}
                  >
                    Z{zone.zone}
                  </div>
                  <div
                    className={`text-[9px] font-bold leading-none tracking-tighter ${
                      val > 0 ? 'text-black/90' : 'text-black/50'
                    }`}
                  >
                    {displayVal}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

interface MetricCardProps {
  title: string;
  value: string;
  unit: string;
  icon?: React.ReactNode;
  iconColorClass?: string;
  valueColor?: string;
}

const MetricCard = ({
  title,
  value,
  unit,
  valueColor,
}: MetricCardProps) => {
  const textRef = useRef<CyclingTextHandle>(null);

  useEffect(() => {
    // Play a short scrambling animation whenever the value changes.
    textRef.current?.play();
  }, [value]);

  return (
    <div className="flex flex-col items-start text-left gap-1">
      <span className="font-sans text-[10px] md:text-xs font-bold text-secondary uppercase tracking-wider truncate">
        {title}
      </span>
      <div className="flex items-baseline justify-start gap-1 mt-1 whitespace-nowrap">
        <span
          className="text-3xl md:text-4xl font-condensed font-black tracking-tight leading-none"
          style={{ color: valueColor || 'var(--color-primary, #FFFFFF)' }}
        >
          <CyclingText
            ref={textRef}
            text={value}
            interval={50}
            hoverPlay={true}
          />
        </span>
        {unit && (
          <span className="text-xs font-medium text-secondary">{unit}</span>
        )}
      </div>
    </div>
  );
};

export default ActivityStats;
