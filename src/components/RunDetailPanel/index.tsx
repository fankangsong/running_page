import { Activity, formatPace, formatRunTime } from '@/utils/utils';

const AEROBIC_ZONES = [
  { zone: 1, min: 0, max: 120, color: '#64b5f6', label: '0-119' },
  { zone: 2, min: 120, max: 140, color: '#66bb6a', label: '120-139' },
  { zone: 3, min: 140, max: 160, color: '#ffee58', label: '140-159' },
  { zone: 4, min: 160, max: 180, color: '#ffa726', label: '160-179' },
  { zone: 5, min: 180, max: Infinity, color: '#ef5350', label: '180+' },
];

const RunDetailPanel = ({
  run,
  monthlyDistanceKm,
}: {
  run: Activity;
  monthlyDistanceKm: number;
}) => {
  const distanceKm = (run.distance / 1000).toFixed(2);
  const runTime = formatRunTime(run.moving_time);
  const pace = run.average_speed ? formatPace(run.average_speed) : `0'00"`;
  const currentHeartRate = Number.isFinite(run.average_heartrate)
    ? Math.round(run.average_heartrate as number)
    : null;
  const heartRate = currentHeartRate !== null ? `${currentHeartRate} bpm` : '~';
  const highlightedZone =
    currentHeartRate === null
      ? null
      : AEROBIC_ZONES.find(
          (zone) =>
            currentHeartRate >= zone.min &&
            (zone.max === Infinity || currentHeartRate < zone.max)
        )?.zone ?? null;
  return (
    <div className="p-4 sm:max-w-[420px] mx-auto">
      <div className="flex justify-between items-center gap-2">
        <div className="text-base font-black text-white tracking-tight truncate">
          {run.name}
        </div>
        <div className="text-xs text-secondary mt-1 whitespace-nowrap">
          {run.start_date_local}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:gap-6 mt-4 sm:mt-6 w-full text-white font-sans relative">
        <div className="flex flex-col gap-2">
          <span className="text-xs sm:text-sm text-[#a0a0a0] font-normal tracking-[0.5px] uppercase flex items-center gap-1">
            <svg
              viewBox="0 0 24 24"
              className="w-4 h-4"
              fill="none"
              stroke="#81d4fa"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 20c5-4 8-8 8-12a8 8 0 1 0-16 0c0 4 3 8 8 12z" />
              <path d="M12 10.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />
            </svg>
            Distance
          </span>
          <div className="text-[26px] sm:text-[32px] font-bold leading-[1.2] bg-gradient-to-r from-[#4fc3f7] to-[#81d4fa] bg-clip-text text-transparent tabular-nums whitespace-nowrap">
            {distanceKm}
            <span className="text-base text-[#cccccc] font-normal ml-1">
              km
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs sm:text-sm text-[#a0a0a0] font-normal tracking-[0.5px] uppercase flex items-center gap-1">
            <svg
              viewBox="0 0 24 24"
              className="w-4 h-4"
              fill="none"
              stroke="#ffd54f"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 3" />
            </svg>
            Pace
          </span>
          <div className="text-[26px] sm:text-[32px] font-bold leading-[1.2] bg-gradient-to-r from-[#4fc3f7] to-[#81d4fa] bg-clip-text text-transparent tabular-nums whitespace-nowrap">
            {pace}
            <span className="text-base text-[#cccccc] font-normal ml-1">
              /km
            </span>
          </div>
          <div className="text-[11px] sm:text-xs text-[#888888] font-normal whitespace-nowrap">
            {run.average_speed ? `${run.average_speed.toFixed(2)} m/s` : '~'}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs sm:text-sm text-[#a0a0a0] font-normal tracking-[0.5px] uppercase flex items-center gap-1">
            <svg
              viewBox="0 0 24 24"
              className="w-4 h-4"
              fill="none"
              stroke="#ef5350"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
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
            <svg
              viewBox="0 0 24 24"
              className="w-4 h-4"
              fill="none"
              stroke="#ef5350"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
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

      <div className="mt-5 sm:mt-6">
        <div className="text-xs sm:text-sm text-[#a0a0a0] font-normal tracking-[0.5px] uppercase mb-2">
          Aerobic Zones
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {AEROBIC_ZONES.map((zone) => {
            const isHighlighted = highlightedZone === zone.zone;
            return (
              <div
                key={zone.zone}
                className={`rounded-md p-1 text-center transition-all ${
                  isHighlighted
                    ? 'border-2 border-white shadow-[0_0_0_1px_rgba(255,255,255,0.35),0_0_14px_rgba(255,255,255,0.35)] scale-[1.03]'
                    : 'border border-white/10'
                }`}
                style={{
                  backgroundColor: zone.color,
                  opacity: isHighlighted ? 1 : 0.22,
                }}
              >
                <div className="text-[10px] font-black text-black/85">Z{zone.zone}</div>
                <div className="text-[9px] leading-4 text-black/75">{zone.label}</div>
                {isHighlighted && currentHeartRate !== null ? (
                  <div className="mt-1 text-[10px] font-black text-black">
                    {/* {currentHeartRate} bpm */}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-5 sm:mt-6">
        <div className="text-xs sm:text-sm text-[#a0a0a0] font-normal tracking-[0.5px] uppercase">
          Monthly Running Distance
        </div>
        <div className="mt-2 text-[24px] sm:text-[30px] font-bold leading-[1.2] bg-gradient-to-r from-[#4fc3f7] to-[#81d4fa] bg-clip-text text-transparent tabular-nums whitespace-nowrap">
          {monthlyDistanceKm.toFixed(2)}
          <span className="text-base text-[#cccccc] font-normal ml-1">km</span>
        </div>
      </div>
    </div>
  );
};

export default RunDetailPanel;
