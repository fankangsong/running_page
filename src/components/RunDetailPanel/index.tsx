import { Activity, formatPace, formatRunTime, isRun } from '@/utils/utils';
import CyclingText from '@/components/CyclingText';

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
  monthRunDates = [],
}: {
  run: Activity;
  monthlyDistanceKm: number;
  monthRunDates?: string[];
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

  // For mini heatmap
  const runDateObj = new Date(run.start_date_local);
  const year = runDateObj.getFullYear();
  const month = runDateObj.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  // Adjust so Monday is 0, Sunday is 6
  const offset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
  const days = Array.from({ length: 42 }, (_, i) => {
    const day = i - offset + 1;
    if (day > 0 && day <= daysInMonth) return day;
    return null;
  });
  // Truncate to 5 weeks if 6th week is completely empty
  const gridDays = days[35] === null ? days.slice(0, 35) : days;
  const currentRunDateStr = run.start_date_local.slice(0, 10);
  const showRunStats = isRun(run.type);

  return (
    <div className="relative w-full mt-2 bg-card rounded-card shadow-lg border border-gray-800/50 p-4 md:p-6 overflow-hidden mx-auto sm:max-w-[480px]">
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-emerald-500/10 to-transparent pointer-events-none" />
      <div className="relative z-10 flex flex-col">
        <div className="flex flex-col gap-1 items-center text-center mb-4">
          <h2 className="text-lg md:text-xl font-black italic uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">
            {run.name || 'Morning Run'}
          </h2>
          <div className="text-[10px] md:text-xs font-medium text-secondary">
            {run.start_date_local}
          </div>
        </div>

        <div className={`grid grid-cols-2 gap-y-8 gap-x-4 ${showRunStats ? 'border-y border-gray-800/50 py-6' : 'border-t border-gray-800/50 pt-6'} `}>
          <div className="flex flex-col items-start text-left gap-1">
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
            <div className="flex items-baseline justify-start gap-1 mt-1 whitespace-nowrap">
              <div className="text-4xl md:text-5xl font-condensed font-black text-emerald-400 tracking-tighter leading-none">
                <CyclingText text={distanceKm} hoverPlay={true} interval={50} className="text-emerald-400" />
              </div>
              <span className="text-xs font-bold text-secondary uppercase tracking-widest">KM</span>
            </div>
          </div>

          <div className="flex flex-col items-start text-left gap-1">
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
            <div className="flex items-baseline justify-start gap-1 mt-1 whitespace-nowrap">
              <div className="text-4xl md:text-5xl font-condensed font-black text-blue-400 tracking-tighter leading-none">
                <CyclingText text={pace} hoverPlay={true} interval={50} className="text-blue-400" />
              </div>
              <span className="text-xs font-bold text-secondary uppercase tracking-widest">/KM</span>
            </div>
            <div className="text-[10px] text-gray-500 font-medium whitespace-nowrap mt-0.5">
              {run.average_speed ? `${run.average_speed.toFixed(2)} m/s` : '~'}
            </div>
          </div>

          <div className="flex flex-col items-start text-left gap-1">
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
            <div className="flex items-baseline justify-start gap-1 mt-1 whitespace-nowrap">
              <div className="text-4xl md:text-5xl font-condensed font-black text-purple-400 tracking-tighter leading-none">
                <CyclingText text={runTime} hoverPlay={true} interval={50} className="text-purple-400" />
              </div>
            </div>
          </div>

          <div className="flex flex-col items-start text-left gap-1">
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
            <div className="flex items-baseline justify-start gap-1 mt-1 whitespace-nowrap">
              <div className="text-4xl md:text-5xl font-condensed font-black text-orange-400 tracking-tighter leading-none">
                <CyclingText text={currentHeartRate !== null ? String(currentHeartRate) : '~'} hoverPlay={true} interval={50} className="text-orange-400" />
              </div>
              {currentHeartRate !== null && (
                <span className="text-xs font-bold text-secondary uppercase tracking-widest">BPM</span>
              )}
            </div>
          </div>
        </div>

        {showRunStats && (
          <div className="flex flex-col mt-5 pt-4 border-t border-gray-800/50 gap-4">
            <div className="flex flex-col items-center w-full max-w-[200px] mx-auto">
              <span className="font-sans text-[9px] md:text-[10px] font-bold text-secondary uppercase tracking-wider mb-1.5">
                Aerobic Zones
              </span>
              <div className="flex flex-col gap-1.5 w-full">
                <div className="flex h-1.5 rounded-full overflow-hidden bg-gray-800">
                  {AEROBIC_ZONES.map((zone) => (
                    <div
                      key={zone.zone}
                      className="h-full transition-all"
                      style={{
                        backgroundColor: zone.color,
                        width: '20%',
                        opacity: highlightedZone === zone.zone ? 1 : 0.2,
                      }}
                    />
                  ))}
                </div>
                <div className="flex justify-between text-[8px] font-bold text-secondary px-1">
                  {AEROBIC_ZONES.map((zone) => (
                    <span
                      key={zone.zone}
                      className={
                        highlightedZone === zone.zone ? 'text-primary' : ''
                      }
                    >
                      Z{zone.zone}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {monthlyDistanceKm > 0 && (
              <div className="flex justify-between items-center bg-gray-900/50 rounded-lg p-3 border border-gray-800/50">
                <div className="flex flex-col">
                  <span className="font-sans text-[9px] font-bold text-secondary uppercase tracking-wider mb-0.5">
                    {runDateObj.toLocaleString('en-US', {
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-condensed font-black text-primary tracking-tight leading-none">
                      {monthlyDistanceKm.toFixed(2)}
                    </span>
                    <span className="text-[10px] font-medium text-secondary">km</span>
                  </div>
                </div>
                
                <div className="flex flex-col gap-0.5 shrink-0">
                  <div className="grid grid-cols-7 gap-0.5">
                    {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                      <div
                        key={`header-${i}`}
                        className="text-[7px] text-center text-secondary font-medium"
                      >
                        {d}
                      </div>
                    ))}
                    {gridDays.map((day, i) => {
                      if (!day) return <div key={i} className="w-2.5 h-2.5" />;
                      const dateStr = `${year}-${String(month + 1).padStart(
                        2,
                        '0'
                      )}-${String(day).padStart(2, '0')}`;
                      const hasRun = monthRunDates.includes(dateStr);
                      const isCurrent = dateStr === currentRunDateStr;
                      return (
                        <div
                          key={i}
                          className={`w-2.5 h-2.5 rounded-[1px] transition-colors ${
                            isCurrent
                              ? 'ring-1 ring-white bg-accent z-10 relative'
                              : hasRun
                              ? 'bg-accent/60'
                              : 'bg-gray-800/50'
                          }`}
                          title={hasRun ? dateStr : ''}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RunDetailPanel;
