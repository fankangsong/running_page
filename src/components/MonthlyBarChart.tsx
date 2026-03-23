import {
  Activity,
  RUN_TYPE,
  HIKE_TYPE,
  WALK_TYPE,
  RIDE_TYPE,
  VIRTUAL_RIDE_TYPE,
  EBIKE_RIDE_TYPE,
} from '@/utils/utils';
import { useMemo, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

const months = [
  'JAN',
  'FEB',
  'MAR',
  'APR',
  'MAY',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OCT',
  'NOV',
  'DEC',
];

interface HoverState {
  index: number;
  rect: DOMRect;
}

const MonthlyBarChart = ({
  runs,
  year,
  activeMonth,
}: {
  runs: Activity[];
  year: string;
  activeMonth?: number;
}) => {
  const [hoverState, setHoverState] = useState<HoverState | null>(null);

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
      <div
        className="h-16 md:h-24 flex items-end gap-2"
        onMouseLeave={() => setHoverState(null)}
      >
        {totals.map((v, i) => {
          const h = `${Math.round((v.total / max) * 100)}%`;
          const isActive = activeMonth ? i + 1 === activeMonth : false;
          return (
            <div
              key={months[i]}
              className="h-full flex-1 flex flex-col items-center gap-1 group relative min-w-0"
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setHoverState({ index: i, rect });
              }}
            >
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
      {hoverState !== null &&
        createPortal(
          <ChartPopover
            data={totals[hoverState.index]}
            month={months[hoverState.index]}
            anchorRect={hoverState.rect}
          />,
          document.body
        )}
    </div>
  );
};

const ChartPopover = ({
  data,
  month,
  anchorRect,
}: {
  data: {
    total: number;
    run: number;
    hike: number;
    walk: number;
    ride: number;
  };
  month: string;
  anchorRect: DOMRect;
}) => {
  const [style, setStyle] = useState<React.CSSProperties>({});
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (popoverRef.current) {
      const popoverRect = popoverRef.current.getBoundingClientRect();
      const left =
        anchorRect.left + anchorRect.width / 2 - popoverRect.width / 2;
      const top = anchorRect.top - popoverRect.height - 8; // 8px gap

      setStyle({
        left: `${left}px`,
        top: `${top}px`,
        opacity: 1,
        transform: 'translateY(0)',
      });
    }
  }, [anchorRect]);

  return (
    <div
      ref={popoverRef}
      className="fixed z-[9999] pointer-events-none transition-all duration-200 ease-out will-change-transform opacity-0 translate-y-1"
      style={style}
    >
      <div className="w-max bg-gray-900/95 backdrop-blur-sm rounded-lg p-2.5 shadow-xl border border-white/10 flex flex-col gap-1.5 min-w-[130px]">
        <div className="text-xs font-bold text-white mb-0.5 border-b border-white/10 pb-1.5 flex justify-between items-center">
          <span>{month}</span>
          <span className="text-emerald-400">{data.total.toFixed(1)} km</span>
        </div>
        {data.run > 0 && (
          <div className="flex justify-between items-center text-[10px] gap-4">
            <span className="text-blue-400 font-medium">Running</span>
            <span className="font-mono text-gray-300">
              {data.run.toFixed(1)}{' '}
              <span className="text-[8px] text-gray-500">KM</span>
            </span>
          </div>
        )}
        {data.hike > 0 && (
          <div className="flex justify-between items-center text-[10px] gap-4">
            <span className="text-emerald-400 font-medium">Hiking</span>
            <span className="font-mono text-gray-300">
              {data.hike.toFixed(1)}{' '}
              <span className="text-[8px] text-gray-500">KM</span>
            </span>
          </div>
        )}
        {data.walk > 0 && (
          <div className="flex justify-between items-center text-[10px] gap-4">
            <span className="text-yellow-400 font-medium">Walking</span>
            <span className="font-mono text-gray-300">
              {data.walk.toFixed(1)}{' '}
              <span className="text-[8px] text-gray-500">KM</span>
            </span>
          </div>
        )}
        {data.ride > 0 && (
          <div className="flex justify-between items-center text-[10px] gap-4">
            <span className="text-purple-400 font-medium">Cycling</span>
            <span className="font-mono text-gray-300">
              {data.ride.toFixed(1)}{' '}
              <span className="text-[8px] text-gray-500">KM</span>
            </span>
          </div>
        )}
        {/* Arrow pointing down */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-gray-900/95 drop-shadow-sm" />
      </div>
    </div>
  );
};

export default MonthlyBarChart;
