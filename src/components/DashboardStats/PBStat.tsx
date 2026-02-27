import useActivities from '@/hooks/useActivities';
import { formatPace } from '@/utils/utils';

const PBStat = () => {
  const { activities: runs } = useActivities();

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
    let bestPace = '';
    let bestDate = '';
    runs.forEach((run) => {
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
    <div className="p-6 w-full text-white font-sans">
      <div className="text-sm text-[#a0a0a0] font-normal tracking-[0.5px] uppercase mb-2 flex items-center gap-1">
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="#ffd54f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2l3 7h7l-5.5 4 2 7-6.5-4-6.5 4 2-7L2 9h7z" />
        </svg>
        PB
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-secondary font-bold uppercase tracking-[0.5px] flex items-center gap-1">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="#4fc3f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4v16" />
              <path d="M4 4h10l-2 3 2 3H4" />
            </svg>
            5K
          </span>
          <div className="text-[28px] font-bold leading-[1.2] bg-gradient-to-r from-[#4fc3f7] to-[#81d4fa] bg-clip-text text-transparent">
            {pb5.pace}<span className="text-base text-[#cccccc] font-normal ml-1">/km</span>
          </div>
          <div className="text-xs text-[#888888] font-normal">
            {pb5.time}{pb5.date ? ` · ${pb5.date}` : ''}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-secondary font-bold uppercase tracking-[0.5px] flex items-center gap-1">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="#4fc3f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4v16" />
              <path d="M4 4h10l-2 3 2 3H4" />
            </svg>
            10K
          </span>
          <div className="text-[28px] font-bold leading-[1.2] bg-gradient-to-r from-[#4fc3f7] to-[#81d4fa] bg-clip-text text-transparent">
            {pb10.pace}<span className="text-base text-[#cccccc] font-normal ml-1">/km</span>
          </div>
          <div className="text-xs text-[#888888] font-normal">
            {pb10.time}{pb10.date ? ` · ${pb10.date}` : ''}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-secondary font-bold uppercase tracking-[0.5px] flex items-center gap-1">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="#4fc3f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4v16" />
              <path d="M4 4h10l-2 3 2 3H4" />
            </svg>
            15K
          </span>
          <div className="text-[28px] font-bold leading-[1.2] bg-gradient-to-r from-[#4fc3f7] to-[#81d4fa] bg-clip-text text-transparent">
            {pb15.pace}<span className="text-base text-[#cccccc] font-normal ml-1">/km</span>
          </div>
          <div className="text-xs text-[#888888] font-normal">
            {pb15.time}{pb15.date ? ` · ${pb15.date}` : ''}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PBStat;
