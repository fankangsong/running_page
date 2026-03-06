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
  [RUN_TYPE]: '🏃‍♀️',
  [HIKE_TYPE]: '🏞️',
  [RIDE_TYPE]: '🚴',
  [VIRTUAL_RIDE_TYPE]: '🚴',
  [EBIKE_RIDE_TYPE]: '🚴',
  [WALK_TYPE]: '🚶',
  [SWIM_TYPE]: '🏊',
  [ROWING_TYPE]: '🚣',
  [KAYAKING_TYPE]: '🛶',
  [SNOWBOARD_TYPE]: '🏂',
  [SKI_TYPE]: '⛷️',
  [ROAD_TRIP_TYPE]: '🚗',
  [CROSSFIT_TYPE]: '🏋️',
  [WEIGHT_TRAINING_TYPE]: '🏋️',
  [WORKOUT_TYPE]: '💪',
  [YOGA_TYPE]: '🧘',
};

const ActivityIcon = ({
  size = 18,
  type = RUN_TYPE,
}: {
  size?: number;
  type?: string;
}) => {
  return (
    <span style={{ fontSize: size, lineHeight: 1 }}>
      {iconMap[type] || '🏃‍♀️'}
    </span>
  );
};

export default ActivityIcon;
