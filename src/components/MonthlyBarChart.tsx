import {
  Activity,
  RUN_TYPE,
  HIKE_TYPE,
  WALK_TYPE,
  RIDE_TYPE,
  VIRTUAL_RIDE_TYPE,
  EBIKE_RIDE_TYPE,
} from '@/utils/utils';
import { useMemo } from 'react';

const months = [
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  '11',
  '12',
];

const MonthlyBarChart = ({
  runs,
  year,
  activeMonth,
}: {
  runs: Activity[];
  year: string;
  activeMonth?: number;
}) => {
  const { totals, max } = useMemo(() => {
    const arr = new Array(12).fill(0).map(() => ({
      total: 0,
      run: 0,
      hike: 0,
      walk: 0,
      ride: 0,
    }));
    runs.forEach((r) => {
      if (!r.start_date_local) return;
      const m = Number(r.start_date_local.slice(5, 7)) - 1;
      if (m >= 0 && m < 12) {
        const d = r.distance || 0;
        const km = d > 200 ? d / 1000 : d;
        arr[m].total += km;

        if (r.type === RUN_TYPE) {
          arr[m].run += km;
        } else if (r.type === HIKE_TYPE) {
          arr[m].hike += km;
        } else if (r.type === WALK_TYPE) {
          arr[m].walk += km;
        } else if (
          r.type === RIDE_TYPE ||
          r.type === VIRTUAL_RIDE_TYPE ||
          r.type === EBIKE_RIDE_TYPE
        ) {
          arr[m].ride += km;
        }
      }
    });
    const mx = Math.max(1, ...arr.map((i) => i.total));
    return { totals: arr, max: mx };
  }, [runs]);

  return (
    <div className="bg-card rounded-card shadow-lg border border-gray-800/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs text-secondary font-bold uppercase tracking-[0.5px]">
          Monthly KM
        </div>
        <div className="text-xs text-gray-400">{year}</div>
      </div>
      <div className="h-16 md:h-24 flex items-end gap-2">
        {totals.map((v, i) => {
          const h = `${Math.round((v.total / max) * 100)}%`;
          const isActive = activeMonth ? i + 1 === activeMonth : false;
          return (
            <div
              key={months[i]}
              className="h-full flex-1 flex flex-col items-center gap-1 group relative min-w-0"
            >
              {/* Popover */}
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-max bg-gray-900/90 backdrop-blur-sm rounded-lg p-2 shadow-xl border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 flex flex-col gap-1 min-w-[120px]">
                <div className="text-xs font-bold text-white mb-1 border-b border-white/10 pb-1">
                  {months[i]}月 Total: {v.total.toFixed(1)} km
                </div>
                {v.run > 0 && (
                  <div className="flex justify-between items-center text-[10px] gap-3">
                    <span className="text-blue-400">Running</span>
                    <span className="font-mono text-white">
                      {v.run.toFixed(1)} KM
                    </span>
                  </div>
                )}
                {v.hike > 0 && (
                  <div className="flex justify-between items-center text-[10px] gap-3">
                    <span className="text-emerald-400">Hiking</span>
                    <span className="font-mono text-white">
                      {v.hike.toFixed(1)} KM
                    </span>
                  </div>
                )}
                {v.walk > 0 && (
                  <div className="flex justify-between items-center text-[10px] gap-3">
                    <span className="text-yellow-400">Walking</span>
                    <span className="font-mono text-white">
                      {v.walk.toFixed(1)} KM
                    </span>
                  </div>
                )}
                {v.ride > 0 && (
                  <div className="flex justify-between items-center text-[10px] gap-3">
                    <span className="text-purple-400">Cycling</span>
                    <span className="font-mono text-white">
                      {v.ride.toFixed(1)} KM
                    </span>
                  </div>
                )}
                {/* Arrow */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900/90" />
              </div>

              <div className="flex-1 w-full flex items-end">
                <div
                  className={`w-full rounded-t origin-bottom transition-[height,transform,box-shadow,filter] duration-500 ease-out group-hover:scale-y-[1.04] group-hover:shadow-lg bg-gradient-to-t from-[#4fc3f7] to-[#81d4fa] ${
                    isActive
                      ? 'opacity-100 shadow-lg shadow-blue-400/40 brightness-110'
                      : 'opacity-70'
                  } ${isActive ? 'scale-y-[1.02]' : ''}`}
                  style={{ height: h, minHeight: v.total > 0 ? '4px' : 0 }}
                />
              </div>
              <div
                className={`text-[10px] transition-colors duration-300 ${
                  isActive ? 'text-primary' : 'text-gray-400'
                } group-hover:text-primary`}
              >
                {months[i]}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MonthlyBarChart;
