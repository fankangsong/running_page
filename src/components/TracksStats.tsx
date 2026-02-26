import React from 'react';
import { Activity, formatPace } from '@/utils/utils';

interface ITracksStatsProps {
  runs: Activity[];
  year: string;
}

const TracksStats = ({ runs, year }: ITracksStatsProps) => {
  let sumDistance = 0;
  let streak = 0;
  let heartRate = 0;
  let heartRateNullCount = 0;
  let totalMetersAvail = 0;
  let totalSecondsAvail = 0;

  runs.forEach((run) => {
    sumDistance += run.distance || 0;
    if (run.average_speed) {
      totalMetersAvail += run.distance || 0;
      totalSecondsAvail += (run.distance || 0) / run.average_speed;
    }
    if (run.average_heartrate) {
      heartRate += run.average_heartrate;
    } else {
      heartRateNullCount++;
    }
    if (run.streak) {
      streak = Math.max(streak, run.streak);
    }
  });

  const distance = (sumDistance / 1000.0).toFixed(1);
  const avgPace = totalSecondsAvail > 0 ? formatPace(totalMetersAvail / totalSecondsAvail) : "0'00\"";
  const avgHeartRate = runs.length - heartRateNullCount > 0 
    ? (heartRate / (runs.length - heartRateNullCount)).toFixed(0) 
    : 'N/A';
  
  return (
    <div className="grid grid-cols-2 gap-4 text-white">
      <div className="flex flex-col gap-1">
        <span className="text-xs text-secondary font-bold uppercase tracking-[0.5px]">Journey</span>
        <div className="text-[32px] font-bold leading-[1.2] bg-gradient-to-r from-[#4fc3f7] to-[#81d4fa] bg-clip-text text-transparent">
          {year === 'Total' ? 'Total' : year}
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs text-secondary font-bold uppercase tracking-[0.5px]">Runs</span>
        <div className="text-[32px] font-bold leading-[1.2] bg-gradient-to-r from-[#4fc3f7] to-[#81d4fa] bg-clip-text text-transparent">
          {runs.length}
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs text-secondary font-bold uppercase tracking-[0.5px]">KM</span>
        <div className="text-[32px] font-bold leading-[1.2] bg-gradient-to-r from-[#4fc3f7] to-[#81d4fa] bg-clip-text text-transparent">
          {distance}
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs text-secondary font-bold uppercase tracking-[0.5px]">Avg Pace</span>
        <div className="text-[32px] font-bold leading-[1.2] bg-gradient-to-r from-[#4fc3f7] to-[#81d4fa] bg-clip-text text-transparent">
          {avgPace}
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs text-secondary font-bold uppercase tracking-[0.5px]">Day Streak</span>
        <div className="text-[32px] font-bold leading-[1.2] bg-gradient-to-r from-[#4fc3f7] to-[#81d4fa] bg-clip-text text-transparent">
          {streak}
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs text-secondary font-bold uppercase tracking-[0.5px]">Avg Heart Rate</span>
        <div className="text-[32px] font-bold leading-[1.2] bg-gradient-to-r from-[#4fc3f7] to-[#81d4fa] bg-clip-text text-transparent">
          {avgHeartRate}
        </div>
      </div>
    </div>
  );
};

export default TracksStats;
