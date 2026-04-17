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
    <div className="relative w-full mt-4 bg-card rounded-card shadow-lg border border-gray-800/50 p-6 md:p-8 overflow-hidden mx-auto sm:max-w-[480px]">
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-emerald-500/10 to-transparent pointer-events-none" />
      <div className="relative z-10 flex flex-col">
        <div className="flex flex-col gap-1 items-center text-center mb-6">
          <h2 className="text-xl md:text-2xl font-black italic uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">
            {run.name || 'Morning Run'}
          </h2>
          <div className="text-xs font-medium text-secondary mt-1">
            {run.start_date_local}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-y-8 gap-x-4 border-y border-gray-800/50 py-8">
          <div className="flex flex-col items-center text-center gap-1">
            <span className="font-sans text-[10px] md:text-xs font-bold text-secondary uppercase tracking-wider truncate flex items-center gap-1">
              <svg
                viewBox="0 0 24 24"
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 20c5-4 8-8 8-12a8 8 0 1 0-16 0c0 4 3 8 8 12z" />
                <path d="M12 10.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />
              </svg>
              Distance
            </span>
            <div className="flex items-baseline justify-center gap-1 mt-1 whitespace-nowrap">
              <span className="text-3xl md:text-4xl font-condensed font-black text-primary tracking-tight leading-none">
                {distanceKm}
              </span>
              <span className="text-xs font-medium text-secondary">km</span>
            </div>
          </div>

          <div className="flex flex-col items-center text-center gap-1">
            <span className="font-sans text-[10px] md:text-xs font-bold text-secondary uppercase tracking-wider truncate flex items-center gap-1">
              <svg
                viewBox="0 0 24 24"
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 3" />
              </svg>
              Pace
            </span>
            <div className="flex items-baseline justify-center gap-1 mt-1 whitespace-nowrap">
              <span className="text-3xl md:text-4xl font-condensed font-black text-primary tracking-tight leading-none">
                {pace}
              </span>
              <span className="text-xs font-medium text-secondary">/km</span>
            </div>
            <div className="text-[10px] text-gray-500 font-medium whitespace-nowrap mt-1">
              {run.average_speed ? `${run.average_speed.toFixed(2)} m/s` : '~'}
            </div>
          </div>

          <div className="flex flex-col items-center text-center gap-1">
            <span className="font-sans text-[10px] md:text-xs font-bold text-secondary uppercase tracking-wider truncate flex items-center gap-1">
              <svg
                viewBox="0 0 24 24"
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 19V5" />
                <path d="M5 12l7-7 7 7" />
              </svg>
              Time
            </span>
            <div className="flex items-baseline justify-center gap-1 mt-1 whitespace-nowrap">
              <span className="text-3xl md:text-4xl font-condensed font-black text-primary tracking-tight leading-none">
                {runTime}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-center text-center gap-1">
            <span className="font-sans text-[10px] md:text-xs font-bold text-secondary uppercase tracking-wider truncate flex items-center gap-1">
              <svg
                viewBox="0 0 24 24"
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20.8 12.1c0 4.8-3.9 8.7-8.7 8.7S3.4 16.9 3.4 12.1c0-4.8 3.9-8.7 8.7-8.7 2.2 0 4.2.8 5.7 2.2" />
                <path d="M12 8v4l2.2 2.2" />
              </svg>
              BPM
            </span>
            <div className="flex items-baseline justify-center gap-1 mt-1 whitespace-nowrap">
              <span className="text-3xl md:text-4xl font-condensed font-black text-primary tracking-tight leading-none">
                {currentHeartRate !== null ? currentHeartRate : '~'}
              </span>
              {currentHeartRate !== null && (
                <span className="text-xs font-medium text-secondary">bpm</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center mt-8">
          <div className="font-sans text-[10px] md:text-xs font-bold text-secondary uppercase tracking-wider mb-3">
            Aerobic Zones
          </div>
          <div className="grid grid-cols-5 gap-1.5 w-full max-w-[280px]">
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
                  <div className="text-[10px] font-black text-black/85">
                    Z{zone.zone}
                  </div>
                  <div className="text-[9px] leading-4 text-black/75">
                    {zone.label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {monthlyDistanceKm > 0 && (
          <div className="flex flex-col items-center text-center gap-1 mt-8">
            <span className="font-sans text-[10px] md:text-xs font-bold text-secondary uppercase tracking-wider truncate">
              Monthly Running Distance
            </span>
            <div className="flex items-baseline justify-center gap-1 mt-1 whitespace-nowrap">
              <span className="text-3xl md:text-4xl font-condensed font-black text-primary tracking-tight leading-none">
                {monthlyDistanceKm.toFixed(2)}
              </span>
              <span className="text-xs font-medium text-secondary">km</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RunDetailPanel;
