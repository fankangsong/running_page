import { useCallback, useEffect, useMemo, useState } from 'react';
import AnnualHeatmap, { HeatmapData } from '@/components/AnnualHeatmap';
import YearSelector from '@/components/YearSelector';
import CyclingText from '@/components/CyclingText';
import useWorkouts from '@/hooks/useWorkouts';
import { Activity, convertMovingTime2Sec } from '@/utils/utils';

const OTHER_TYPE = 'Workout';

// Heatmap cell value encodes the activity types of that day:
// 1 = WeightTraining only, 2 = Workout only, 3 = both types
const VALUE_STRENGTH_ONLY = 1;
const VALUE_OTHER_ONLY = 2;
const VALUE_MIXED = 3;

// Legend driven by activity type instead of session-count buckets.
// thresholds=[2,3] maps value 1 -> idx 0, 2 -> idx 1, 3 -> idx 2.
const TYPE_LEGEND_ITEMS = [
  {
    label: 'WeightTraining',
    title: 'Strength Training',
    colorClass: 'bg-violet-400',
  },
  {
    label: 'Workout',
    title: 'Other Workouts',
    colorClass: 'bg-emerald-400',
  },
  {
    label: 'Mixed',
    title: 'WeightTraining + Workout',
    colorClass: 'bg-yellow-400',
  },
];

const TYPE_THRESHOLDS = [2, 3];

interface DayDetail {
  types: Set<string>;
  count: number;
  totalSeconds: number;
  calories: number;
  hrSum: number;
  hrCount: number;
  typeNames: string[];
}

const formatDuration = (seconds: number): string => {
  if (!seconds || seconds <= 0) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  return `${m}m`;
};

const parseLocalDate = (dateStr: string) => new Date(dateStr.replace(' ', 'T'));

const StrengthStats = () => {
  const workouts = useWorkouts();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
  const [dayDetails, setDayDetails] = useState<Map<string, DayDetail>>(
    new Map()
  );
  const [stats, setStats] = useState({
    count: 0,
    hours: 0,
    calories: 0,
    avgHr: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Years derived from all workouts
  const years = useMemo(() => {
    const set = new Set<number>();
    workouts.forEach((w: Activity) => {
      const y = parseLocalDate(w.start_date_local).getFullYear();
      if (!isNaN(y)) set.add(y);
    });
    if (!set.has(currentYear)) set.add(currentYear);
    return Array.from(set).sort((a, b) => b - a);
  }, [workouts, currentYear]);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    const timer = setTimeout(() => {
      const yearWorkouts = workouts.filter(
        (w: Activity) => parseLocalDate(w.start_date_local).getFullYear() === selectedYear
      );

      // Aggregate per-day details and overall stats
      const detailsByDate = new Map<string, DayDetail>();
      let totalSeconds = 0;
      let totalCalories = 0;
      let hrSum = 0;
      let hrCount = 0;

      yearWorkouts.forEach((w: Activity) => {
        const dateKey = w.start_date_local.slice(0, 10);
        if (!dateKey) return;

        let detail = detailsByDate.get(dateKey);
        if (!detail) {
          detail = {
            types: new Set<string>(),
            count: 0,
            totalSeconds: 0,
            calories: 0,
            hrSum: 0,
            hrCount: 0,
            typeNames: [],
          };
          detailsByDate.set(dateKey, detail);
        }

        detail.types.add(w.type);
        detail.count += 1;
        const sessionSeconds = convertMovingTime2Sec(w.moving_time);
        detail.totalSeconds += sessionSeconds;
        detail.calories += w.calories || 0;
        if (w.average_heartrate) {
          detail.hrSum += w.average_heartrate;
          detail.hrCount += 1;
        }
        const cleanName = w.name?.replace(/\s*\n\s*/g, ' ').trim();
        if (cleanName && !detail.typeNames.includes(cleanName)) {
          detail.typeNames.push(cleanName);
        }

        totalSeconds += sessionSeconds;
        totalCalories += w.calories || 0;
        if (w.average_heartrate) {
          hrSum += w.average_heartrate;
          hrCount += 1;
        }
      });

      // Encode cell value by day's activity types
      const data: HeatmapData[] = Array.from(detailsByDate.entries()).map(
        ([date, detail]) => ({
          date,
          value:
            detail.types.size === 2
              ? VALUE_MIXED
              : detail.types.has(OTHER_TYPE)
                ? VALUE_OTHER_ONLY
                : VALUE_STRENGTH_ONLY,
        })
      );

      if (isMounted) {
        setHeatmapData(data);
        setDayDetails(detailsByDate);
        setStats({
          count: yearWorkouts.length,
          hours: totalSeconds / 3600,
          calories: Math.round(totalCalories),
          avgHr: hrCount > 0 ? Math.round(hrSum / hrCount) : 0,
        });
        setIsLoading(false);
      }
    }, 50);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [workouts, selectedYear]);

  // Multi-line tooltip: type name + sessions/duration + metrics + session names
  const formatTypeTooltip = useCallback(
    (value: number, date: string): string[] => {
      const typeName =
        value === VALUE_MIXED
          ? 'WeightTraining + Workout'
          : value === VALUE_OTHER_ONLY
            ? 'Workout'
            : 'WeightTraining';

      const detail = dayDetails.get(date);
      if (!detail) return [typeName];

      const lines = [
        typeName,
        `${detail.count} session${detail.count > 1 ? 's' : ''} · ${formatDuration(detail.totalSeconds)}`,
      ];

      const metrics: string[] = [];
      if (detail.calories > 0) {
        metrics.push(`${Math.round(detail.calories)} kcal`);
      }
      if (detail.hrCount > 0) {
        metrics.push(`${Math.round(detail.hrSum / detail.hrCount)} bpm`);
      }
      if (metrics.length > 0) {
        lines.push(metrics.join(' · '));
      }

      detail.typeNames.slice(0, 2).forEach((name) => {
        lines.push(name.length > 28 ? `${name.slice(0, 28)}…` : name);
      });
      if (detail.typeNames.length > 2) {
        lines.push(`+${detail.typeNames.length - 2} more`);
      }

      return lines;
    },
    [dayDetails]
  );

  return (
    <div className="relative w-full bg-card rounded-card shadow-lg border border-gray-800/50 p-6 md:p-8 overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-violet-500/10 to-transparent pointer-events-none" />

      <div className="relative z-10">
        {/* Header area of the card */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <svg
                viewBox="0 0 24 24"
                className="w-6 h-6 text-violet-400"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6.5 6.5h11M6.5 17.5h11M4 9v6M20 9v6M7 4v16M17 4v16M2 11v2M22 11v2" />
              </svg>
              <h2 className="text-xl md:text-2xl font-black italic uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-purple-500">
                WORKOUT HEATMAP
              </h2>
            </div>

            <div className="flex items-start gap-6 flex-wrap">
              <div className="flex flex-col gap-1">
                <span className="font-sans text-[10px] md:text-xs font-bold text-secondary uppercase tracking-wider">
                  TOTAL SESSIONS
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <CyclingText
                    text={String(stats.count)}
                    className="text-3xl md:text-4xl font-condensed font-black text-violet-400 tracking-tight leading-none"
                    hoverPlay={true}
                    interval={50}
                  />
                </div>
              </div>
              <div className="w-px h-8 bg-gray-800/50 hidden md:block self-center"></div>
              <div className="flex flex-col gap-1">
                <span className="font-sans text-[10px] md:text-xs font-bold text-secondary uppercase tracking-wider">
                  TOTAL TIME
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <CyclingText
                    text={stats.hours.toFixed(1)}
                    className="text-3xl md:text-4xl font-condensed font-black text-violet-400 tracking-tight leading-none"
                    hoverPlay={true}
                    interval={50}
                  />
                  <span className="text-xs font-medium text-secondary">H</span>
                </div>
              </div>
              <div className="w-px h-8 bg-gray-800/50 hidden md:block self-center"></div>
              <div className="flex flex-col gap-1">
                <span className="font-sans text-[10px] md:text-xs font-bold text-secondary uppercase tracking-wider">
                  TOTAL CALORIES
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <CyclingText
                    text={String(stats.calories)}
                    className="text-3xl md:text-4xl font-condensed font-black text-violet-400 tracking-tight leading-none"
                    hoverPlay={true}
                    interval={50}
                  />
                  <span className="text-xs font-medium text-secondary">KCAL</span>
                </div>
              </div>
              <div className="w-px h-8 bg-gray-800/50 hidden md:block self-center"></div>
              <div className="flex flex-col gap-1">
                <span className="font-sans text-[10px] md:text-xs font-bold text-secondary uppercase tracking-wider">
                  AVG HEART RATE
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <CyclingText
                    text={stats.avgHr > 0 ? String(stats.avgHr) : '--'}
                    className="text-3xl md:text-4xl font-condensed font-black text-violet-400 tracking-tight leading-none"
                    hoverPlay={true}
                    interval={50}
                  />
                  {stats.avgHr > 0 && (
                    <span className="text-xs font-medium text-secondary">BPM</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <YearSelector
            years={years}
            selectedYear={selectedYear}
            onSelect={setSelectedYear}
          />
        </div>

        <div className="relative min-h-[180px] md:min-h-[180px]">
          {/* Loading overlay - only show when no data exists yet */}
          {heatmapData.length === 0 && isLoading && (
            <div className="absolute inset-0 bg-card/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
              <div className="text-secondary font-medium animate-pulse">
                Loading {selectedYear} data...
              </div>
            </div>
          )}

          <AnnualHeatmap
            year={selectedYear}
            data={heatmapData}
            isLoading={false}
            animationKey={`workout-${selectedYear}-${
              heatmapData.length > 0 ? 'ready' : 'waiting'
            }`}
            thresholds={TYPE_THRESHOLDS}
            legendItems={TYPE_LEGEND_ITEMS}
            formatTooltip={formatTypeTooltip}
          />
        </div>
      </div>
    </div>
  );
};

export default StrengthStats;
