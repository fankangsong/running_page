import {
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

export const iconMap: Record<string, string> = {
  [RUN_TYPE]: 'directions_run',
  [HIKE_TYPE]: 'hiking',
  [RIDE_TYPE]: 'directions_bike',
  [VIRTUAL_RIDE_TYPE]: 'directions_bike',
  [EBIKE_RIDE_TYPE]: 'directions_bike',
  [WALK_TYPE]: 'directions_walk',
  [SWIM_TYPE]: 'pool',
  [ROWING_TYPE]: 'rowing',
  [KAYAKING_TYPE]: 'kayaking',
  [SNOWBOARD_TYPE]: 'snowboarding',
  [SKI_TYPE]: 'downhill_skiing',
  [ROAD_TRIP_TYPE]: 'directions_car',
  [CROSSFIT_TYPE]: 'fitness_center',
  [WEIGHT_TRAINING_TYPE]: 'fitness_center',
  [WORKOUT_TYPE]: 'fitness_center',
  [YOGA_TYPE]: 'self_improvement',
};

const ActivityIcon = ({
  size = 18,
  type = RUN_TYPE,
  className = '',
}: {
  size?: number;
  type?: string;
  className?: string;
}) => {
  return (
    <span
      className={`material-icons ${className}`}
      style={{
        fontSize: size,
        display: 'inline-flex',
        verticalAlign: 'middle',
      }}
    >
      {iconMap[type] || 'directions_run'}
    </span>
  );
};

export default ActivityIcon;
