import useActivities from '@/hooks/useActivities';
import { formatPace, convertMovingTime2Sec } from '@/utils/utils';
import CyclingText from '@/components/CyclingText'

const TotalStat = () => {
  const { activities: runs } = useActivities();

  let sumDistance = 0;
  let totalSeconds = 0;
  let heartRateSum = 0;
  let heartRateCount = 0;
  let totalMetersAvail = 0;
  let totalSecondsAvail = 0;
  let minTime = Infinity;
  let maxTime = 0;
  let maxDistance = 0;
  let minDistance = runs.length > 0 ? Infinity : 0;

  runs.forEach((run) => {
    const dist = run.distance / 1000;
    sumDistance += dist;
    
    // Time
    totalSeconds += convertMovingTime2Sec(run.moving_time);

    // Heart Rate
    if (run.average_heartrate) {
      heartRateSum += run.average_heartrate;
      heartRateCount++;
    }

    // Pace Calculation Data
    if (run.average_speed) {
      totalMetersAvail += run.distance;
      totalSecondsAvail += run.distance / run.average_speed;
    }

    // Date Range
    const runDate = new Date(run.start_date_local.replace(' ', 'T')).getTime();
    if (runDate < minTime) minTime = runDate;
    if (runDate > maxTime) maxTime = runDate;

    // Max/Min Distance
    if (dist > maxDistance) maxDistance = dist;
    if (dist < minDistance) minDistance = dist;
  });

  // Summary Metrics
  const totalKm = sumDistance.toFixed(1);
  const totalHours = (totalSeconds / 3600).toFixed(2);
  
  // Avg Metrics
  const avgPace = totalSecondsAvail > 0 ? formatPace(totalMetersAvail / totalSecondsAvail) : "0'00\"";
  const avgHeartRate = heartRateCount > 0 ? (heartRateSum / heartRateCount).toFixed(0) : '0';
  
  let weeks = 1;
  if (minTime !== Infinity && maxTime !== 0 && maxTime >= minTime) {
      weeks = Math.max(1, (maxTime - minTime) / (1000 * 60 * 60 * 24 * 7));
  }
  const avgWeeklyKm = (sumDistance / weeks).toFixed(1);

  // Max/Min Metrics
  const maxDistStr = maxDistance.toFixed(0);
  const maxRoundedKm = Number(maxDistStr);
  const maxCount = runs.reduce((acc, run) => {
    const distKm = run.distance / 1000;
    return acc + (Math.round(distKm) === maxRoundedKm ? 1 : 0);
  }, 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6
    w-full max-w-[800px] mx-auto text-white font-sans relative">
      {/* Item 1: Summary */}
      <div className="flex flex-col gap-2 relative md:after:content-[''] md:after:absolute md:after:-right-3 md:after:top-[10%] md:after:h-[80%] md:after:w-[1px] md:after:bg-gradient-to-b md:after:from-transparent md:after:via-[#333] md:after:to-transparent">
        <span className="text-sm text-[#a0a0a0] font-normal tracking-[0.5px] uppercase flex items-center gap-1">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="#81d4fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="21" x2="4" y2="10" />
            <line x1="10" y1="21" x2="10" y2="3" />
            <line x1="16" y1="21" x2="16" y2="6" />
          </svg>
          Summary
        </span>
        <div className="text-[32px] font-bold leading-[1.2] bg-gradient-to-r from-[#4fc3f7] to-[#81d4fa] bg-clip-text text-transparent">
          <CyclingText text={totalKm} hoverPlay={true} interval={50} />
          <span className="text-base text-[#cccccc] font-normal ml-1">km</span>
        </div>
        <div className="text-xs text-[#888888] font-normal">
          {runs.length} runs / {totalHours} hours
        </div>
      </div>

      {/* Item 2: Avg */}
      <div className="flex flex-col gap-2 relative md:after:content-[''] md:after:absolute md:after:-right-3 md:after:top-[10%] md:after:h-[80%] md:after:w-[1px] md:after:bg-gradient-to-b md:after:from-transparent md:after:via-[#333] md:after:to-transparent">
        <span className="text-sm text-[#a0a0a0] font-normal tracking-[0.5px] uppercase flex items-center gap-1">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="#ffd54f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 3" />
          </svg>
          Avg
        </span>
        <div className="text-[32px] font-bold leading-[1.2] bg-gradient-to-r from-[#4fc3f7] to-[#81d4fa] bg-clip-text text-transparent">
          <CyclingText text={avgPace} hoverPlay={true} interval={50} />
          <span className="text-base text-[#cccccc] font-normal ml-1">/km</span>
        </div>
        <div className="text-xs text-[#888888] font-normal">
          {avgHeartRate} bpm / {avgWeeklyKm} weekly km
        </div>
      </div>

      {/* Item 3: Max */}
      <div className="flex flex-col gap-2">
        <span className="text-sm text-[#a0a0a0] font-normal tracking-[0.5px] uppercase flex items-center gap-1">
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="#ef5350" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19V5" />
            <path d="M5 12l7-7 7 7" />
          </svg>
          Max
        </span>
        <div className="text-[32px] font-bold leading-[1.2] bg-gradient-to-r from-[#4fc3f7] to-[#81d4fa] bg-clip-text text-transparent">
          <CyclingText text={maxDistStr} hoverPlay={true} interval={50} />
          <span className="text-base text-[#cccccc] font-normal ml-1">km</span>
        </div>
        <div className="text-xs text-[#888888] font-normal">
          {maxCount} runs
        </div>
      </div>
    </div>
  );
};

export default TotalStat;
