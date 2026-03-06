import { Activity, convertMovingTime2Sec } from '@/utils/utils';
import RunPolyline from '@/components/RunPolyline';

interface ActivityCardProps {
  run: Activity;
  onClick: () => void;
  colorClass: string;
}


const ActivityCard = ({ run, onClick, colorClass }: ActivityCardProps) => {
  const displayTitle = run.name || 'Run';
  const displayDistance = (run.distance / 1000).toFixed(1);
  const displayDate = run.start_date_local.split(' ')[0];

  const durationTotalSeconds = convertMovingTime2Sec(run.moving_time);
  const hours = Math.floor(durationTotalSeconds / 3600);
  const minutes = Math.floor((durationTotalSeconds % 3600) / 60);
  const displayDuration =
    hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;


  return (
    <div
      className="flex items-center gap-4 py-2 border-b border-gray-800/30 hover:bg-gray-800/20 transition-colors cursor-pointer group"
      onClick={onClick}
    >
      {/* Left: Polyline */}
      <div className="w-14 h-14 shrink-0 rounded overflow-hidden relative opacity-60 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all">
        <RunPolyline run={run} />
      </div>

      {/* Right: Data */}
      <div className="flex-1 min-w-0 flex flex-col justify-center h-14 gap-0.5">
        <div className="flex justify-between items-center gap-2">
          <div className="text-sm font-medium text-gray-500 truncate group-hover:text-gray-300 transition-colors">
            {displayTitle}
          </div>
          <div className="text-[10px] text-gray-600 font-mono shrink-0">
            {displayDate}
          </div>
        </div>
        
        <div className="flex justify-between items-baseline text-xs mt-1">
          <div className="font-mono text-base font-bold text-gray-400 group-hover:text-gray-200 transition-colors leading-none">
            {displayDistance}
            <span className="text-[10px] font-normal text-gray-600 ml-0.5">
              km
            </span>
          </div>
          <div className="text-[10px] text-gray-600 font-mono">
            {displayDuration}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityCard;
