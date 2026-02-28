import { Activity, formatPace, formatRunTime } from '@/utils/utils';

const RunDetailPanel = ({ run }: { run: Activity }) => {
  const distanceKm = (run.distance / 1000).toFixed(2);
  const runTime = formatRunTime(run.moving_time);
  const pace = run.average_speed ? formatPace(run.average_speed) : `0'00"`;
  const heartRate = run.average_heartrate ? `${run.average_heartrate.toFixed(0)} bpm` : '~';
  const location = run.location_country ?? 'Unknown';

  return (
    <div className="p-4 sm:max-w-[420px] mx-auto">
      <div className="flex justify-between items-center gap-2">
        <div className="text-base font-black text-white tracking-tight truncate">{run.name}</div>
        <div className="text-xs text-secondary mt-1 whitespace-nowrap">{run.start_date_local}</div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:gap-6 mt-4 sm:mt-6 w-full text-white font-sans relative">
        <div className="flex flex-col gap-2">
          <span className="text-xs sm:text-sm text-[#a0a0a0] font-normal tracking-[0.5px] uppercase flex items-center gap-1">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="#81d4fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20c5-4 8-8 8-12a8 8 0 1 0-16 0c0 4 3 8 8 12z" />
              <path d="M12 10.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />
            </svg>
            Distance
          </span>
          <div className="text-[26px] sm:text-[32px] font-bold leading-[1.2] bg-gradient-to-r from-[#4fc3f7] to-[#81d4fa] bg-clip-text text-transparent tabular-nums whitespace-nowrap">
            {distanceKm}
            <span className="text-base text-[#cccccc] font-normal ml-1">km</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs sm:text-sm text-[#a0a0a0] font-normal tracking-[0.5px] uppercase flex items-center gap-1">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="#ffd54f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 3" />
            </svg>
            Pace
          </span>
          <div className="text-[26px] sm:text-[32px] font-bold leading-[1.2] bg-gradient-to-r from-[#4fc3f7] to-[#81d4fa] bg-clip-text text-transparent tabular-nums whitespace-nowrap">
            {pace}
            <span className="text-base text-[#cccccc] font-normal ml-1">/km</span>
          </div>
          <div className="text-[11px] sm:text-xs text-[#888888] font-normal whitespace-nowrap">
            {run.average_speed ? `${run.average_speed.toFixed(2)} m/s` : '~'}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs sm:text-sm text-[#a0a0a0] font-normal tracking-[0.5px] uppercase flex items-center gap-1">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="#ef5350" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19V5" />
              <path d="M5 12l7-7 7 7" />
            </svg>
            Time
          </span>
          <div className="text-[26px] sm:text-[32px] font-bold leading-[1.2] bg-gradient-to-r from-[#4fc3f7] to-[#81d4fa] bg-clip-text text-transparent tabular-nums whitespace-nowrap">
            {runTime}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs sm:text-sm text-[#a0a0a0] font-normal tracking-[0.5px] uppercase flex items-center gap-1">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="#ef5350" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.8 12.1c0 4.8-3.9 8.7-8.7 8.7S3.4 16.9 3.4 12.1c0-4.8 3.9-8.7 8.7-8.7 2.2 0 4.2.8 5.7 2.2" />
              <path d="M12 8v4l2.2 2.2" />
            </svg>
            BPM
          </span>
          <div className="text-[26px] sm:text-[32px] font-bold leading-[1.2] bg-gradient-to-r from-[#4fc3f7] to-[#81d4fa] bg-clip-text text-transparent tabular-nums whitespace-nowrap">
            {heartRate}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RunDetailPanel;
