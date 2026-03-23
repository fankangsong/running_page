import { useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '@/components/Layout';
import RunPolyline from '@/components/RunPolyline';
import RunDetailPanel from '@/components/RunDetailPanel';
import useActivities from '@/hooks/useActivities';
import NotFound from '@/pages/404';
import { isRun } from '@/utils/utils';

const RunDetail = () => {
  const { runId } = useParams();
  const runIdNumber = Number(runId);
  const { activities } = useActivities();

  const run = useMemo(() => {
    if (!runId || Number.isNaN(runIdNumber)) return null;
    return activities.find((r) => r.run_id === runIdNumber) ?? null;
  }, [activities, runId, runIdNumber]);

  const monthlyDistanceKm = useMemo(() => {
    if (!run?.start_date_local) return 0;
    const yearMonth = run.start_date_local.slice(0, 7);
    const monthDistance = activities.reduce((sum, activity) => {
      if (!isRun(activity.type)) return sum;
      if (activity.start_date_local.slice(0, 7) !== yearMonth) return sum;
      return sum + activity.distance;
    }, 0);
    return monthDistance / 1000;
  }, [activities, run]);

  if (!runId || Number.isNaN(runIdNumber) || !run) {
    return <NotFound />;
  }

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }, []);

  return (
    <Layout>
      <div className="max-w-[480px] mx-auto">
        <div className="flex justify-center items-center ">
          <RunPolyline run={run} className="w-[260px] h-[260px]" />
        </div>
        <RunDetailPanel run={run} monthlyDistanceKm={monthlyDistanceKm} />
      </div>
    </Layout>
  );
};

export default RunDetail;
