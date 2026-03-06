import {
  Activity,
  HIKE_TYPE,
  RIDE_TYPE,
  VIRTUAL_RIDE_TYPE,
  EBIKE_RIDE_TYPE,
  WALK_TYPE,
  scrollToMap,
} from '@/utils/utils';
import ActivityCard from './ActivityCard';
import ActivityIcon from '@/components/ActivityIcon';
import activitiesData from '@/static/activities.json';

interface Props {
  onClick: (run: Activity) => void;
}

const ActivityCardList = ({ onClick }: Props) => {
  const activities = activitiesData as Activity[];
  const filterAndSort = (types: string[]) =>
    activities
      .filter((r) => types.includes(r.type) && !!r.summary_polyline)
      .sort(
        (a, b) =>
          new Date(b.start_date_local.replace(' ', 'T')).getTime() -
          new Date(a.start_date_local.replace(' ', 'T')).getTime()
      );

  const hikingRuns = filterAndSort([HIKE_TYPE]);
  const cyclingRuns = filterAndSort([
    RIDE_TYPE,
    VIRTUAL_RIDE_TYPE,
    EBIKE_RIDE_TYPE,
  ]);
  const walkingRuns = filterAndSort([WALK_TYPE]);

  if (
    hikingRuns.length === 0 &&
    cyclingRuns.length === 0 &&
    walkingRuns.length === 0
  ) {
    return null;
  }

  const handleActivityClick = (run: Activity) => {
    onClick(run);
    scrollToMap();
  };

  const renderColumn = (
    title: string,
    iconType: string,
    runs: Activity[],
    colorClass: string
  ) => (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2 pb-2 border-b border-gray-800">
        <div className={`text-${colorClass}-400`}>
          <ActivityIcon type={iconType} size={24} />
        </div>
        <span className="text-lg font-bold text-gray-200">{title}</span>
        <span className="text-sm text-gray-500 font-mono">
          / {runs.length} times
        </span>
      </div>
      <div className="flex flex-col gap-6">
        {runs.map((run) => (
          <ActivityCard
            key={run.run_id}
            run={run}
            onClick={() => handleActivityClick(run)}
            colorClass={colorClass}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {hikingRuns.length > 0 &&
        renderColumn('Hiking', HIKE_TYPE, hikingRuns, 'emerald')}
      {cyclingRuns.length > 0 &&
        renderColumn('Cycling', RIDE_TYPE, cyclingRuns, 'blue')}
      {walkingRuns.length > 0 &&
        renderColumn('Walking', WALK_TYPE, walkingRuns, 'yellow')}
    </div>
  );
};

export default ActivityCardList;
