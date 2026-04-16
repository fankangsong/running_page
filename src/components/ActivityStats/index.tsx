import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Activity, formatPace, convertMovingTime2Sec, getAerobicZone, AEROBIC_ZONES } from '@/utils/utils';
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
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
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

const ActivityStats: React.FC<ActivityStatsProps> = ({ activities }) => {
  const [timeSpan, setTimeSpan] = useState<TimeSpan>('month');
  const [dimension, setDimension] = useState<Dimension>('distance');
  const [referenceDate, setReferenceDate] = useState(new Date());

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

  // 1. Filter activities based on timeSpan and referenceDate
  const filteredActivities = useMemo(() => {
    if (timeSpan === 'all') return activities;

    const refYear = referenceDate.getFullYear();
    const refMonth = referenceDate.getMonth();
    
    if (timeSpan === 'year') {
      return activities.filter(a => new Date(a.start_date_local.replace(' ', 'T')).getFullYear() === refYear);
    }
    
    if (timeSpan === 'month') {
      return activities.filter(a => {
        const d = new Date(a.start_date_local.replace(' ', 'T'));
        return d.getFullYear() === refYear && d.getMonth() === refMonth;
      });
    }

    if (timeSpan === 'week') {
      const start = getStartOfWeek(referenceDate);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      return activities.filter(a => {
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

    filteredActivities.forEach(a => {
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

  // 3. Prepare chart data
  const chartData = useMemo(() => {
    let data: { label: string; value: number }[] = [];
    
    if (timeSpan === 'week') {
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      data = days.map(d => ({ label: d, value: 0 }));
      filteredActivities.forEach(a => {
        const d = new Date(a.start_date_local.replace(' ', 'T'));
        const day = d.getDay();
        const idx = day === 0 ? 6 : day - 1;
        if (dimension === 'distance') data[idx].value += a.distance / 1000;
        else if (dimension === 'time') data[idx].value += convertMovingTime2Sec(a.moving_time) / 60; // minutes
        else data[idx].value += 1;
      });
    } else if (timeSpan === 'month') {
      const daysInMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0).getDate();
      data = Array.from({ length: daysInMonth }, (_, i) => ({ label: `${i + 1}`, value: 0 }));
      filteredActivities.forEach(a => {
        const d = new Date(a.start_date_local.replace(' ', 'T'));
        const idx = d.getDate() - 1;
        if (dimension === 'distance') data[idx].value += a.distance / 1000;
        else if (dimension === 'time') data[idx].value += convertMovingTime2Sec(a.moving_time) / 60;
        else data[idx].value += 1;
      });
    } else if (timeSpan === 'year') {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      data = months.map(m => ({ label: m, value: 0 }));
      filteredActivities.forEach(a => {
        const d = new Date(a.start_date_local.replace(' ', 'T'));
        const idx = d.getMonth();
        if (dimension === 'distance') data[idx].value += a.distance / 1000;
        else if (dimension === 'time') data[idx].value += convertMovingTime2Sec(a.moving_time) / 60;
        else data[idx].value += 1;
      });
    } else {
      // All - group by year
      const yearMap = new Map<number, number>();
      activities.forEach(a => {
        const y = new Date(a.start_date_local.replace(' ', 'T')).getFullYear();
        let val = 0;
        if (dimension === 'distance') val = a.distance / 1000;
        else if (dimension === 'time') val = convertMovingTime2Sec(a.moving_time) / 60;
        else val = 1;
        yearMap.set(y, (yearMap.get(y) || 0) + val);
      });
      const sortedYears = Array.from(yearMap.keys()).sort();
      data = sortedYears.map(y => ({ label: `${y}`, value: yearMap.get(y) || 0 }));
    }

    return data;
  }, [filteredActivities, activities, timeSpan, dimension, referenceDate]);

  const maxValue = Math.max(...chartData.map(d => d.value), 1); // Avoid div by 0

  // Title formatting
  let title = '';
  if (timeSpan === 'week') {
    title = `${referenceDate.getFullYear()} Week ${getISOWeek(referenceDate)}`;
  } else if (timeSpan === 'month') {
    const monthName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][
      referenceDate.getMonth()
    ];
    title = `${referenceDate.getFullYear()} ${monthName}`;
  } else if (timeSpan === 'year') {
    title = `${referenceDate.getFullYear()}`;
  } else {
    title = 'All Time';
  }

  return (
    <div className="w-full bg-card rounded-card shadow-lg border border-gray-800/50 p-4 lg:p-6 overflow-hidden relative">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-6">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2 justify-start">
          {timeSpans.map(t => (
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

        {/* Navigation & Title */}
        <div className="flex items-center gap-3">
          {timeSpan !== 'all' && (
            <button onClick={handlePrev} className="p-1.5 hover:bg-gray-800 rounded-full text-secondary hover:text-primary transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <span className="text-sm font-bold text-primary min-w-[120px] text-center tracking-wide">{title}</span>
          {timeSpan !== 'all' && (
            <button onClick={handleNext} className="p-1.5 hover:bg-gray-800 rounded-full text-secondary hover:text-primary transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
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

      {/* Chart Area */}
      <div className="h-32 md:h-44 mb-6 flex items-end gap-2 border-b border-gray-800/50 pb-2">
        {chartData.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative min-w-0">
            {/* Tooltip */}
            <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 bg-gray-900/95 backdrop-blur-sm border border-white/10 rounded-lg px-2.5 py-1.5 shadow-xl flex flex-col items-center pointer-events-none transition-all duration-200 ease-out z-10 -translate-y-1 group-hover:translate-y-0 min-w-[max-content]">
              <span className="text-[10px] text-gray-400 font-medium mb-0.5">{d.label}</span>
              <span className="text-xs font-mono text-white font-bold">
                {dimension === 'time' ? formatDuration(d.value * 60) : d.value.toFixed(1)}
                {dimension === 'distance' && <span className="text-[8px] text-gray-500 ml-0.5">KM</span>}
              </span>
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-[4px] border-transparent border-t-gray-900/95" />
            </div>

            <div className="flex-1 w-full flex items-end justify-center">
              <div 
                className="w-full max-w-[32px] rounded-t origin-bottom transition-[height,transform,filter] duration-500 ease-out group-hover:scale-y-[1.04] bg-gradient-to-t from-[#4fc3f7] to-[#81d4fa] opacity-80 group-hover:opacity-100 group-hover:brightness-110"
                style={{ height: `${(d.value / maxValue) * 100}%`, minHeight: d.value > 0 ? '4px' : '0' }}
              ></div>
            </div>
            
            <div className="text-[10px] text-gray-500 mt-2 truncate w-full text-center transition-colors group-hover:text-primary">
              {d.label}
            </div>
          </div>
        ))}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-6">
        <MetricCard 
          title="Total Distance" 
          value={metrics.totalDist.toFixed(1)} 
          unit="KM" 
          iconColorClass="text-blue-400"
          valueColor="#60a5fa"
          icon={<svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>}
        />
        <MetricCard 
          title="Total Time" 
          value={formatDuration(metrics.totalTime)} 
          unit="" 
          iconColorClass="text-purple-400"
          valueColor="#c084fc"
          icon={<svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>}
        />
        <MetricCard 
          title="Total Runs" 
          value={metrics.count.toString()} 
          unit="runs" 
          iconColorClass="text-orange-400"
          valueColor="#fb923c"
          icon={<svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>}
        />
        <MetricCard 
          title="Avg Pace" 
          value={metrics.avgPace} 
          unit="" 
          iconColorClass="text-emerald-400"
          valueColor="#34d399"
          icon={<svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>}
        />
        <MetricCard 
          title="Avg HR" 
          value={metrics.avgHR} 
          unit="bpm" 
          iconColorClass="text-rose-400"
          valueColor="#fb7185"
          icon={<svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>}
        />
        <MetricCard 
          title="Best Pace" 
          value={metrics.maxPace} 
          unit="" 
          iconColorClass="text-yellow-400"
          valueColor="#facc15"
          icon={<svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>}
        />
        
        {/* Graphic Aerobic Zones */}
        <div className="flex flex-col gap-1 p-2 rounded-xl col-span-2 sm:col-span-2 lg:col-span-2">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-gray-800/50 flex items-center justify-center shrink-0 text-cyan-400">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" /></svg>
            </div>
            <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">Avg Aerobic Zone</span>
          </div>
          <div className="grid grid-cols-5 gap-1.5 w-full h-full pb-1">
            {AEROBIC_ZONES.map((zone) => {
              const isHighlighted = metrics.aerobicZoneText === `Z${zone.zone}`;
              return (
                <div
                  key={zone.zone}
                  className={`rounded-md p-1 text-center transition-all flex flex-col justify-center ${
                    isHighlighted
                      ? 'border border-white/50 shadow-[0_0_8px_rgba(255,255,255,0.2)] scale-[1.05]'
                      : 'border border-white/5'
                  }`}
                  style={{
                    backgroundColor: zone.color,
                    opacity: isHighlighted ? 1 : 0.2,
                  }}
                >
                  <div className={`text-[10px] font-black ${isHighlighted ? 'text-black' : 'text-black/80'}`}>
                    Z{zone.zone}
                  </div>
                </div>
              );
            })}
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
  icon: React.ReactNode;
  iconColorClass: string;
  valueColor?: string;
}

const MetricCard = ({ title, value, unit, icon, iconColorClass, valueColor }: MetricCardProps) => {
  const textRef = useRef<CyclingTextHandle>(null);

  useEffect(() => {
    // Play a short scrambling animation whenever the value changes.
    textRef.current?.play();
  }, [value]);

  return (
    <div className="flex flex-col gap-1 p-2 rounded-xl">
      <div className="flex items-center gap-2 mb-1">
        <div className={`w-6 h-6 rounded-full bg-gray-800/50 flex items-center justify-center shrink-0 ${iconColorClass}`}>
          {icon}
        </div>
        <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">{title}</span>
      </div>
      <div className="flex items-baseline gap-1 mt-0.5 whitespace-nowrap">
        <span 
          className="text-xl lg:text-2xl font-black tracking-tight leading-none"
          style={{ color: valueColor || 'var(--color-primary, #FFFFFF)' }}
        >
          <CyclingText ref={textRef} text={value} interval={50} hoverPlay={true} />
        </span>
        {unit && <span className="text-xs font-medium text-secondary">{unit}</span>}
      </div>
    </div>
  );
};

export default ActivityStats;
