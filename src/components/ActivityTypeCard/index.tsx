import { useState, useMemo, CSSProperties } from 'react';
import {
  Activity,
  Coordinate,
  RUN_TYPE,
  HIKE_TYPE,
  WALK_TYPE,
  sortDateFunc,
  pathForRun,
  convertMovingTime2Sec,
  formatPace,
} from '@/utils/utils';
import ActivityIcon from '@/components/ActivityIcon';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const formatTooltipDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return {
    date: `${date.getFullYear()}-${month}-${day}`,
    weekday: WEEKDAYS[date.getDay()],
  };
};

interface ActivityTypeCardProps {
  type: typeof RUN_TYPE | typeof HIKE_TYPE | typeof WALK_TYPE;
  activities: Activity[];
  onActivityClick?: (_activity: Activity) => void;
}

const TYPE_CONFIG = {
  [RUN_TYPE]: {
    title: 'RUNNING',
    gradient: 'from-cyan-400 to-blue-500',
    numberColor: 'text-cyan-400',
    accent: '#22D3EE',
    glow: 'rgba(34, 211, 238, 0.5)',
  },
  [HIKE_TYPE]: {
    title: 'HIKING',
    gradient: 'from-violet-400 to-purple-500',
    numberColor: 'text-violet-400',
    accent: '#A78BFA',
    glow: 'rgba(167, 139, 250, 0.5)',
  },
  [WALK_TYPE]: {
    title: 'WALKING',
    gradient: 'from-amber-400 to-orange-500',
    numberColor: 'text-amber-400',
    accent: '#FBBF24',
    glow: 'rgba(251, 191, 36, 0.5)',
  },
};

// Compute polyline points for mini map display
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

// Distance-based color picker
const getDistanceColor = (distanceKm: number): string => {
  if (distanceKm < 5) return '#60A5FA'; // Blue - Short (< 5km)
  if (distanceKm < 10) return '#34D399'; // Green - Medium (5-10km)
  if (distanceKm < 21) return '#FBBF24'; // Yellow - Long (10-21km)
  if (distanceKm < 42) return '#FB923C'; // Orange - Half Marathon (21-42km)
  return '#F87171'; // Red - Marathon+ (>= 42km)
};

interface TrackGridItemProps {
  activity: Activity;
  onClick?: () => void;
  accent: string;
}

const TrackGridItem = ({ activity, onClick, accent }: TrackGridItemProps) => {
  const coordinates = pathForRun(activity);
  const points = coordinates.length >= 2 ? computePolylinePoints(coordinates) : '';
  const hasPolyline = points.length > 0;
  const distanceKm = activity.distance / 1000;
  const strokeColor = getDistanceColor(distanceKm);
  const { date, weekday } = formatTooltipDate(activity.start_date_local);

  return (
    <div
      onClick={onClick}
      className="group relative aspect-square cursor-pointer"
    >
      {/* Hover Tooltip */}
      <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-card bg-card/95 px-3 py-2 text-center opacity-0 translate-y-1 shadow-xl border border-gray-800/50 backdrop-blur-sm transition-all duration-300 ease-out group-hover:opacity-100 group-hover:translate-y-0">
        <div className="flex flex-col items-center gap-1">
          {/* Title */}
          <p className="text-xs font-bold text-primary leading-none">{activity.name || 'Activity'}</p>
          {/* Date + Weekday */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-medium text-secondary">{date}</span>
            <span className="text-[10px] font-medium" style={{ color: accent }}>{weekday}</span>
          </div>
          {/* Distance */}
          <p className="text-xs font-condensed font-black leading-none" style={{ color: strokeColor }}>
            {distanceKm.toFixed(1)} <span className="text-[10px] font-medium text-secondary">km</span>
          </p>
        </div>
        {/* Arrow */}
        <div className="absolute left-1/2 top-full -translate-x-1/2">
          <div className="h-0 w-0 border-l-[5px] border-r-[5px] border-t-[5px] border-l-transparent border-r-transparent border-t-card/95" />
        </div>
      </div>

      {/* Track content - no background */}
      <div className="w-full h-full flex items-center justify-center p-1">
        {hasPolyline ? (
          <svg
            viewBox="0 0 28 28"
            className="w-full h-full transition-all duration-300 group-hover:scale-110"
          >
            <polyline
              points={points}
              fill="none"
              stroke={strokeColor}
              strokeWidth="0.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="opacity-70 group-hover:opacity-100 transition-opacity"
            />
          </svg>
        ) : (
          <div className="w-full h-full flex items-center justify-center opacity-30 group-hover:opacity-60 transition-opacity">
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5"
              fill="none"
              stroke={strokeColor}
              strokeWidth="1.5"
            >
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};

const ActivityTypeCard = ({
  type,
  activities,
  onActivityClick,
}: ActivityTypeCardProps) => {
  const config = TYPE_CONFIG[type];
  const [currentYearIndex, setCurrentYearIndex] = useState(0);

  // Filter activities by type and sort by date
  const filteredActivities = useMemo(() => {
    return activities
      .filter((a) => a.type === type)
      .sort(sortDateFunc);
  }, [activities, type]);

  // Group by year
  const activitiesByYear = useMemo(() => {
    const groups: Record<string, Activity[]> = {};
    filteredActivities.forEach((activity) => {
      const year = activity.start_date_local.slice(0, 4);
      if (!groups[year]) groups[year] = [];
      groups[year].push(activity);
    });
    return Object.entries(groups).sort((a, b) => Number(b[0]) - Number(a[0]));
  }, [filteredActivities]);


  const currentYear = activitiesByYear[currentYearIndex]?.[0] || '';
  const currentYearActivities = activitiesByYear[currentYearIndex]?.[1] || [];

  // Calculate year stats
  const yearStats = useMemo(() => {
    if (currentYearActivities.length === 0) return null;

    const totalDistance = currentYearActivities.reduce((sum, a) => sum + a.distance, 0) / 1000;
    const totalTime = currentYearActivities.reduce((sum, a) => sum + convertMovingTime2Sec(a.moving_time), 0);
    const totalRuns = currentYearActivities.length;

    // Average pace calculation
    let avgPace = '--';
    let totalMeters = 0;
    let totalSeconds = 0;
    currentYearActivities.forEach((a) => {
      if (a.average_speed) {
        totalMeters += a.distance;
        totalSeconds += a.distance / a.average_speed;
      }
    });
    if (totalSeconds > 0) {
      avgPace = formatPace(totalMeters / totalSeconds);
    }

    // Average heart rate
    const activitiesWithHR = currentYearActivities.filter((a) => a.average_heartrate);
    const avgHeartRate = activitiesWithHR.length > 0
      ? Math.round(activitiesWithHR.reduce((sum, a) => sum + (a.average_heartrate || 0), 0) / activitiesWithHR.length)
      : null;

    return {
      totalDistance,
      totalTime,
      totalRuns,
      avgPace,
      avgHeartRate,
    };
  }, [currentYearActivities]);

  const handlePrevYear = () => {
    setCurrentYearIndex((prev) => (prev > 0 ? prev - 1 : activitiesByYear.length - 1));
  };

  const handleNextYear = () => {
    setCurrentYearIndex((prev) => (prev < activitiesByYear.length - 1 ? prev + 1 : 0));
  };

  if (filteredActivities.length === 0) {
    return (
      <div className="w-full py-20 flex flex-col items-center justify-center">
        <div className="text-center space-y-4">
          <div className={config.numberColor}>
            <ActivityIcon type={type} size={48} />
          </div>
          <h2 className={`text-4xl md:text-5xl font-black italic uppercase tracking-tight text-transparent bg-clip-text bg-gradient-to-r ${config.gradient}`}>
            {config.title}
          </h2>
          <p className="text-secondary text-sm">No activities recorded</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6" style={{ '--accent-color': config.accent } as CSSProperties}>

      {/* Year Card - For Screenshot Sharing */}
      <div className="bg-card rounded-card border border-gray-800/50 p-6 md:p-8">
        {/* Year Navigation Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={handlePrevYear}
            className="p-2 text-secondary hover:text-primary transition-colors disabled:opacity-30"
            disabled={activitiesByYear.length <= 1}
            type="button"
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          <div className="flex flex-col items-center">
            <span className="text-xs font-bold text-secondary uppercase tracking-widest mb-1">YEAR</span>
            <span
              key={`${type}-${currentYear}`}
              className="text-5xl md:text-6xl font-condensed font-black italic tracking-tighter text-[var(--accent-color)] transition-none"
            >
              {currentYear}
            </span>
            <span className="text-sm text-secondary mt-1">
              {currentYearActivities.length} tracks
            </span>
          </div>

          <button
            onClick={handleNextYear}
            className="p-2 text-secondary hover:text-primary transition-colors disabled:opacity-30"
            disabled={activitiesByYear.length <= 1}
            type="button"
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>

        {/* Year Timeline Dots */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {activitiesByYear.map(([year], index) => (
            <button
              key={year}
              onClick={() => setCurrentYearIndex(index)}
              className={`w-2 h-2 rounded-full transition-all duration-200 ${
                index === currentYearIndex ? 'bg-primary w-6' : 'bg-gray-700 hover:bg-gray-600'
              }`}
              type="button"
              title={year}
            />
          ))}
        </div>

        {/* Year Stats Grid */}
        {yearStats && (
          <div key={`${type}-${currentYear}-stats`} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 py-4 border-t border-b border-gray-800/30">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1">Total Distance</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-condensed font-black text-[var(--accent-color)]">
                  {yearStats.totalDistance.toFixed(1)}
                </span>
                <span className="text-xs text-secondary">km</span>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1">Total Time</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-condensed font-black text-[var(--accent-color)]">
                  {(yearStats.totalTime / 3600).toFixed(1)}
                </span>
                <span className="text-xs text-secondary">h</span>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1">Avg Pace</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-condensed font-black text-[var(--accent-color)]">
                  {yearStats.avgPace}
                </span>
                <span className="text-xs text-secondary">/km</span>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1">Avg Heart Rate</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-condensed font-black text-[var(--accent-color)]">
                  {yearStats.avgHeartRate || '--'}
                </span>
                <span className="text-xs text-secondary">bpm</span>
              </div>
            </div>
          </div>
        )}

        {/* Tracks Grid - No background color for tracks */}
        <div key={`${type}-${currentYear}-grid`} className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-1">
          {currentYearActivities.map((activity) => (
            <TrackGridItem
              key={activity.run_id}
              activity={activity}
              onClick={() => onActivityClick?.(activity)}
              accent={config.accent}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ActivityTypeCard;
