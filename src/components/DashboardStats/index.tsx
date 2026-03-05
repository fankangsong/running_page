import React from 'react';
import useActivities from '@/hooks/useActivities';
import { formatPace, convertMovingTime2Sec, isRun } from '@/utils/utils';
import CyclingText from '@/components/CyclingText';

interface StatItemProps {
  label: string;
  value: string | number;
  unit?: string;
  subtext: React.ReactNode;
  icon: React.ReactNode;
  iconColorClass?: string;
  valueSizeClass?: string;
}

const StatItem = ({
  label,
  value,
  unit,
  subtext,
  icon,
  iconColorClass = 'text-primary',
  valueSizeClass = 'text-2xl lg:text-3xl',
}: StatItemProps) => (
  <div className="flex flex-col gap-1">
    <div className="flex items-center gap-2 mb-1">
      <div
        className={`w-6 h-6 rounded-full bg-gray-800/50 flex items-center justify-center shrink-0 ${iconColorClass}`}
      >
        {icon}
      </div>
      <span className="text-[10px] font-bold text-secondary uppercase tracking-wider truncate">
        {label}
      </span>
    </div>
    <div className="flex items-baseline gap-1">
      <div
        className={`${valueSizeClass} font-black text-primary tracking-tight leading-none`}
      >
        <CyclingText
          className="text-[#4fc3f7]"
          text={String(value)}
          hoverPlay={true}
          interval={50}
        />
      </div>
      {unit && (
        <span className="text-xs font-medium text-secondary">{unit}</span>
      )}
    </div>
    <div className="text-[10px] font-medium text-gray-500 whitespace-nowrap overflow-hidden text-ellipsis h-4">
      {subtext}
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
  const maxCount = runs.reduce((acc, run) => {
    if (!isRun(run.type)) return acc;
    const distKm = run.distance / 1000;
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

  const getPB = (targetMeters: number) => {
    let bestSeconds = Infinity;
    let bestPace = '--';
    let bestDate = '';
    runs.forEach((run) => {
      if (!isRun(run.type)) return;
      if (run.average_speed && run.distance >= targetMeters) {
        const seconds = targetMeters / run.average_speed;
        if (seconds < bestSeconds) {
          bestSeconds = seconds;
          bestPace = formatPace(run.average_speed);
          bestDate = run.start_date_local.split(' ')[0];
        }
      }
    });
    return bestSeconds === Infinity
      ? { pace: '--', time: '--', date: '' }
      : { pace: bestPace, time: formatSeconds(bestSeconds), date: bestDate };
  };

  const pb5 = getPB(5000);
  const pb10 = getPB(10000);
  const pb15 = getPB(15000);

  return (
    <div className="bg-card rounded-2xl shadow-xl border border-white/5 overflow-hidden">
      <div className="flex flex-col md:flex-row">
        {/* Total Stats Section */}
        <div className="flex-1 p-6 bg-gradient-to-br from-gray-900/50 to-gray-800/30">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8">
            <StatItem
              label="Total"
              value={totalKm}
              unit="km"
              iconColorClass="text-blue-400"
              icon={
                <svg
                  viewBox="0 0 24 24"
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              }
              subtext={`${runs.length} runs · ${totalHours}h`}
            />
            <StatItem
              label="Avg Pace"
              value={avgPace}
              unit="/km"
              iconColorClass="text-emerald-400"
              icon={
                <svg
                  viewBox="0 0 24 24"
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
              }
              subtext={`${avgHeartRate} bpm · ${avgWeeklyKm} km/wk`}
            />
            <StatItem
              label="Longest"
              value={maxDistStr}
              unit="km"
              iconColorClass="text-purple-400"
              icon={
                <svg
                  viewBox="0 0 24 24"
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              }
              subtext={`${maxCount} runs`}
            />
          </div>
        </div>

        {/* Divider */}
        <div className="h-px md:h-auto md:w-px bg-white/10" />

        {/* PB Stats Section */}
        <div className="flex-1 p-6 bg-gradient-to-br from-gray-900/30 to-black/20">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8">
            <StatItem
              label="5K Best"
              value={pb5.pace}
              unit="/km"
              valueSizeClass="text-xl lg:text-2xl"
              iconColorClass="text-orange-400"
              icon={<span className="text-[10px] font-black">5K</span>}
              subtext={
                <div className="flex flex-col gap-0.5">
                  <span className="font-mono text-gray-400">{pb5.time}</span>
                  <span className="text-[10px] opacity-70">{pb5.date}</span>
                </div>
              }
            />
            <StatItem
              label="10K Best"
              value={pb10.pace}
              unit="/km"
              valueSizeClass="text-xl lg:text-2xl"
              iconColorClass="text-orange-400"
              icon={<span className="text-[10px] font-black">10K</span>}
              subtext={
                <div className="flex flex-col gap-0.5">
                  <span className="font-mono text-gray-400">{pb10.time}</span>
                  <span className="text-[10px] opacity-70">{pb10.date}</span>
                </div>
              }
            />
            <StatItem
              label="15K Best"
              value={pb15.pace}
              unit="/km"
              valueSizeClass="text-xl lg:text-2xl"
              iconColorClass="text-orange-400"
              icon={<span className="text-[10px] font-black">15K</span>}
              subtext={
                <div className="flex flex-col gap-0.5">
                  <span className="font-mono text-gray-400">{pb15.time}</span>
                  <span className="text-[10px] opacity-70">{pb15.date}</span>
                </div>
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardStats;
