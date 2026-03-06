import {
  Activity,
  HIKE_TYPE,
  RIDE_TYPE,
  VIRTUAL_RIDE_TYPE,
  EBIKE_RIDE_TYPE,
} from '@/utils/utils';
import ActivityCard from './ActivityCard';

interface Props {
  activities: Activity[];
  onClick: (run: Activity) => void;
}

const ActivityCardList = ({ activities, onClick }: Props) => {
  const filtered = activities
    .filter(
      (r) =>
        [HIKE_TYPE, RIDE_TYPE, VIRTUAL_RIDE_TYPE, EBIKE_RIDE_TYPE].includes(
          r.type
        ) && !!r.summary_polyline
    )
    .sort(
      (a, b) =>
        new Date(b.start_date_local.replace(' ', 'T')).getTime() -
        new Date(a.start_date_local.replace(' ', 'T')).getTime()
    );

  if (filtered.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {filtered.map((run) => (
        <ActivityCard key={run.run_id} run={run} onClick={() => onClick(run)} />
      ))}
    </div>
  );
};

export default ActivityCardList;
