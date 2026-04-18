import React from 'react';
import useActivities from '@/hooks/useActivities';
import { formatPace, convertMovingTime2Sec, isRun } from '@/utils/utils';
import CyclingText from '@/components/CyclingText';

import { Activity } from '@/utils/utils';

interface StatItemProps {
  label: string;
  value: string | number;
  unit?: string;
  subtext?: React.ReactNode;
  valueColorClass?: string;
  className?: string;
  valueSizeClass?: string;
  labelSizeClass?: string;
}

const BigNumberStat = ({
  label,
  value,
  unit,
  subtext,
  valueColorClass = 'text-primary',
  className = '',
  valueSizeClass = 'text-5xl md:text-7xl',
  labelSizeClass = 'text-xs md:text-sm',
}: StatItemProps) => (
  <div className={`flex flex-col items-start text-left ${className}`}>
    <span
      className={`font-sans font-black text-secondary uppercase tracking-widest ${labelSizeClass}`}
    >
      {label}
    </span>
    <div className="flex items-baseline justify-start gap-1 md:gap-2 mt-1 md:mt-2">
      <div
        className={`${valueSizeClass} font-condensed font-black ${valueColorClass} tracking-tighter leading-none`}
      >
        <CyclingText
          className={valueColorClass}
          text={String(value)}
          hoverPlay={true}
          interval={50}
        />
      </div>
      {unit && (
        <span
          className={`text-sm md:text-xl font-bold text-secondary uppercase tracking-widest`}
        >
          {unit}
        </span>
      )}
    </div>
    {subtext && (
      <div className="text-xs md:text-sm font-medium text-gray-500 mt-2 whitespace-nowrap overflow-hidden text-ellipsis uppercase tracking-wider">
        {subtext}
      </div>
    )}
  </div>
);

interface DashboardStatsProps {
  runs?: Activity[];
}

const DashboardStats = ({ runs: propRuns }: DashboardStatsProps) => {
  const { activities } = useActivities();
  const runs = propRuns || activities;

  // Logic from TotalStat
  let sumDistance = 0;
  let totalSeconds = 0;
  let heartRateSum = 0;
  let heartRateCount = 0;
  let totalMetersAvail = 0;
  let totalSecondsAvail = 0;
  let minTime = Infinity;
  let maxTime = 0;
  let maxDistance = 0;

  runs.forEach((run) => {
    if (!isRun(run.type)) return;
    const dist = run.distance / 1000;
    sumDistance += dist;
    totalSeconds += convertMovingTime2Sec(run.moving_time);
    if (run.average_heartrate) {
      heartRateSum += run.average_heartrate;
      heartRateCount++;
    }
    if (run.average_speed) {
      totalMetersAvail += run.distance;
      totalSecondsAvail += run.distance / run.average_speed;
    }
    const runDate = new Date(run.start_date_local.replace(' ', 'T')).getTime();
    if (runDate < minTime) minTime = runDate;
    if (runDate > maxTime) maxTime = runDate;
    if (dist > maxDistance) maxDistance = dist;
  });

  const totalKm = sumDistance.toFixed(1);
  const totalHours = (totalSeconds / 3600).toFixed(2);
  const avgPace =
    totalSecondsAvail > 0
      ? formatPace(totalMetersAvail / totalSecondsAvail)
      : '0\'00"';
  const avgHeartRate =
    heartRateCount > 0 ? (heartRateSum / heartRateCount).toFixed(0) : '0';
  let weeks = 1;
  if (minTime !== Infinity && maxTime !== 0 && maxTime >= minTime) {
    weeks = Math.max(1, (maxTime - minTime) / (1000 * 60 * 60 * 24 * 7));
  }
  const avgWeeklyKm = (sumDistance / weeks).toFixed(1);
  const maxDistStr = maxDistance.toFixed(0);
  const maxRoundedKm = Number(maxDistStr);
  const maxCount = runs.reduce((acc, r) => {
    if (!isRun(r.type)) return acc;
    const distKm = r.distance / 1000;
    return acc + (Math.round(distKm) === maxRoundedKm ? 1 : 0);
  }, 0);

  // Logic from PBStat
  const formatSeconds = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.round(s % 60);
    const mm = m < 10 && h > 0 ? `0${m}` : `${m}`;
    const ss = sec < 10 ? `0${sec}` : `${sec}`;
    return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getPB = (
    targetMeters: number
  ): { pace: string; time: string; date: string; run: Activity | null } => {
    let bestSeconds = Infinity;
    let bestPace = '--';
    let bestDate = '';
    let bestRun: Activity | null = null;

    runs.forEach((run) => {
      if (!isRun(run.type)) return;
      if (!run.summary_polyline) return;
      if (run.average_speed && run.distance >= targetMeters) {
        const seconds = targetMeters / run.average_speed;
        if (seconds < bestSeconds) {
          bestSeconds = seconds;
          bestPace = formatPace(run.average_speed);
          bestDate = run.start_date_local.split(' ')[0];
          bestRun = run;
        }
      }
    });
    return bestSeconds === Infinity
      ? { pace: '--', time: '--', date: '', run: null }
      : {
          pace: bestPace,
          time: formatSeconds(bestSeconds),
          date: bestDate,
          run: bestRun,
        };
  };

  const pb5 = getPB(5000);
  const pb10 = getPB(10000);
  const pb15 = getPB(15000);
  const pbHalf = getPB(21097.5);

  return (
    <div className="flex flex-col gap-16 md:gap-24 w-full py-8">
      {/* Summary Section */}
      <div className="relative w-full">
        <div className="relative z-10 flex flex-col gap-8 md:gap-12">
          <div className="flex flex-col gap-1">
            <h2 className="text-5xl md:text-8xl font-black italic uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200 leading-none">
              SUMMARY
            </h2>
            <div className="h-1 w-24 bg-gradient-to-r from-emerald-400 to-teal-200 mt-2" />
          </div>

          <div className="flex flex-col gap-8 md:gap-16">
            {/* Hero Stat */}
            <div className="w-full">
              <BigNumberStat
                label="TOTAL DISTANCE"
                value={totalKm}
                unit="KM"
                subtext={`${runs.length} runs`}
                valueColorClass="text-emerald-400"
                valueSizeClass="text-7xl md:text-[12rem]"
                labelSizeClass="text-sm md:text-xl"
              />
            </div>

            {/* Secondary Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-12 border-t border-gray-800/50 pt-8">
              <BigNumberStat
                label="TOTAL TIME"
                value={totalHours}
                unit="H"
                subtext={`${avgWeeklyKm} km/wk`}
                valueColorClass="text-blue-400"
                valueSizeClass="text-5xl md:text-7xl"
              />
              <BigNumberStat
                label="AVERAGE PACE"
                value={avgPace}
                unit="/KM"
                subtext={`Avg speed`}
                valueColorClass="text-purple-400"
                valueSizeClass="text-5xl md:text-7xl"
              />
              <BigNumberStat
                label="AVG HEART RATE"
                value={avgHeartRate}
                unit="BPM"
                subtext={`Heart rate`}
                valueColorClass="text-orange-400"
                valueSizeClass="text-5xl md:text-7xl"
                className="col-span-2 md:col-span-1"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Personal Bests Section */}
      <div className="relative w-full">
        <div className="relative z-10 flex flex-col gap-8 md:gap-12">
          <div className="flex flex-col gap-1">
            <h2 className="text-5xl md:text-8xl font-black italic uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 leading-none">
              RECORDS
            </h2>
            <div className="h-1 w-24 bg-gradient-to-r from-blue-400 to-indigo-400 mt-2" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16">
            <BigNumberStat
              label="FASTEST 5K"
              value={pb5.time}
              subtext={formatDate(pb5.date)}
              valueColorClass="text-accent"
              valueSizeClass="text-6xl md:text-8xl"
            />
            <BigNumberStat
              label="FASTEST 10K"
              value={pb10.time}
              subtext={formatDate(pb10.date)}
              valueColorClass="text-accent"
              valueSizeClass="text-6xl md:text-8xl"
            />
            <BigNumberStat
              label="FASTEST 15K"
              value={pb15.time}
              subtext={formatDate(pb15.date)}
              valueColorClass="text-accent"
              valueSizeClass="text-6xl md:text-8xl"
            />
            <BigNumberStat
              label="LONGEST RUN"
              value={maxDistStr}
              unit="KM"
              subtext={`${maxCount} runs`}
              valueColorClass="text-accent"
              valueSizeClass="text-6xl md:text-8xl"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardStats;
