import {
  Activity,
  RUN_TYPE,
  HIKE_TYPE,
  RIDE_TYPE,
  VIRTUAL_RIDE_TYPE,
  EBIKE_RIDE_TYPE,
  WALK_TYPE,
  SWIM_TYPE,
  ROWING_TYPE,
  KAYAKING_TYPE,
  SNOWBOARD_TYPE,
  SKI_TYPE,
  ROAD_TRIP_TYPE,
  CROSSFIT_TYPE,
  WEIGHT_TRAINING_TYPE,
  WORKOUT_TYPE,
  YOGA_TYPE,
} from '@/utils/utils';
import RunPolyline from '@/components/RunPolyline';
import ActivityIcon from '@/components/ActivityIcon';

interface ActivityCardProps {
  run: Activity;
  onClick: () => void;
}

const ActivityCard = ({ run, onClick }: ActivityCardProps) => {
  const displayTitle = run.name || 'Run';

  return (
    <div
      className="flex items-center gap-3 bg-card border border-gray-800/50 rounded-lg p-3 hover:bg-gray-800/50 cursor-pointer transition-colors"
      onClick={onClick}
    >
      {/* Left: Polyline */}
      <div className="w-12 h-12 shrink-0 rounded  overflow-hidden relative">
        <RunPolyline run={run} />
      </div>

      {/* Right: Data */}
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
        <div className="flex items-center gap-1.5 text-sm font-bold text-gray-200">
          <div className="shrink-0 opacity-70">
            <ActivityIcon size={16} type={run.type} />
          </div>
          <span className="truncate">{displayTitle}</span>
        </div>
        <div className="text-xs text-gray-500 font-normal">
          {run.start_date_local}
        </div>
      </div>
    </div>
  );
};

export default ActivityCard;
