import React from 'react';
import useActivities from '@/hooks/useActivities';
import { formatPace, convertMovingTime2Sec, isRun } from '@/utils/utils';
import CyclingText from '@/components/CyclingText';

import { Activity } from '@/utils/utils';

interface StatItemProps {
  label: string;
  value: string | number;
  unit?: string;
  subtext: React.ReactNode;
  valueColorClass?: string;
  className?: string;
}

const BigNumberStat = ({
  label,
  value,
  unit,
  subtext,
  valueColorClass = 'text-primary',
  className = '',
}: StatItemProps) => (
  <div className={`flex flex-col items-start text-left gap-1 ${className}`}>
    <span className="font-sans text-[10px] md:text-xs font-bold text-secondary uppercase tracking-wider truncate">
      {label}
    </span>
    <div className="flex items-baseline justify-start gap-1 mt-1">
      <div
        className={`text-3xl md:text-4xl font-condensed font-black ${valueColorClass} tracking-tight leading-none`}
      >
        <CyclingText
          className={valueColorClass}
          text={String(value)}
          hoverPlay={true}
          interval={50}
        />
      </div>
      {unit && (
        <span className={`text-xs font-medium text-secondary`}>{unit}</span>
      )}
    </div>
    <div className="text-[10px] md:text-xs font-medium text-gray-500 mt-1 whitespace-nowrap overflow-hidden text-ellipsis">
      {subtext || '\u00A0'}
    </div>
  </div>
);

const DashboardStats = () => {
  const { activities: runs } = useActivities();

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
    <div className="flex flex-col gap-6 w-full">
      {/* Summary Section */}
      <div className="relative w-full bg-card rounded-card shadow-lg border border-gray-800/50 p-6 md:p-8 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <svg
              viewBox="0 0 24 24"
              className="w-6 h-6 text-emerald-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            <h2 className="text-xl md:text-2xl font-black italic uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">
              SUMMARY
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            <BigNumberStat
              label="TOTAL DISTANCE"
              value={totalKm}
              unit="KM"
              subtext={`${runs.length} runs`}
              valueColorClass="text-primary"
            />
            <BigNumberStat
              label="TOTAL TIME"
              value={totalHours}
              unit="H"
              subtext={`${avgWeeklyKm} km/wk`}
              valueColorClass="text-primary"
            />
            <BigNumberStat
              label="AVERAGE PACE"
              value={avgPace}
              unit="/KM"
              subtext={`${avgHeartRate} bpm`}
              valueColorClass="text-primary"
            />
            <BigNumberStat
              label="LONGEST RUN"
              value={maxDistStr}
              unit="KM"
              subtext={`${maxCount} runs`}
              valueColorClass="text-primary"
            />
          </div>
        </div>
      </div>

      {/* Personal Bests Section */}
      <div className="relative w-full bg-card rounded-card shadow-lg border border-gray-800/50 p-6 md:p-8 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-orange-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <svg
              viewBox="0 0 24 24"
              className="w-6 h-6 text-blue-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
            <h2 className="text-xl md:text-2xl font-black italic uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
              PERSONAL BESTS
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            <BigNumberStat
              label="FASTEST 5K"
              value={pb5.time}
              subtext={formatDate(pb5.date)}
              valueColorClass="text-accent"
            />
            <BigNumberStat
              label="FASTEST 10K"
              value={pb10.time}
              subtext={formatDate(pb10.date)}
              valueColorClass="text-accent"
            />
            <BigNumberStat
              label="FASTEST 15K"
              value={pb15.time}
              subtext={formatDate(pb15.date)}
              valueColorClass="text-accent"
            />
            <BigNumberStat
              label="HALF MARATHON"
              value={pbHalf.time}
              subtext={formatDate(pbHalf.date)}
              valueColorClass="text-accent"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardStats;
