import { Activity } from '@/utils/utils';
import { useMemo } from 'react';

const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const MonthlyBarChart = ({ runs, year }: { runs: Activity[]; year: string }) => {
  const { totals, max } = useMemo(() => {
    const arr = new Array(12).fill(0);
    runs.forEach((r) => {
      if (!r.start_date_local) return;
      const m = Number(r.start_date_local.slice(5, 7)) - 1;
      if (m >= 0 && m < 12) {
        const d = r.distance || 0;
        const km = d > 200 ? d / 1000 : d;
        arr[m] += km;
      }
    });
    const mx = Math.max(1, ...arr);
    return { totals: arr, max: mx };
  }, [runs]);

  return (
    <div className="bg-card rounded-card shadow-lg border border-gray-800/50 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs text-secondary font-bold uppercase tracking-[0.5px]">Monthly KM</div>
        <div className="text-xs text-gray-400">{year}</div>
      </div>
      <div className="h-24 flex items-end gap-2">
        {totals.map((v, i) => {
          const h = `${Math.round((v / max) * 100)}%`;
          return (
            <div key={months[i]} className="h-full flex-1 flex flex-col items-center gap-1">
              <div className="flex-1 w-full flex items-end">
                <div
                  className="w-full bg-gradient-to-t from-[#4fc3f7] to-[#81d4fa] rounded-t"
                  style={{ height: h, minHeight: v > 0 ? '4px' : 0 }}
                  title={`${months[i]}: ${v.toFixed(1)} km`}
                />
              </div>
              <div className="text-[10px] text-gray-400">{months[i]}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MonthlyBarChart;
