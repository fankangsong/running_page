import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '@/components/Layout';
import RunPolyline from '@/components/RunPolyline';
import RunDetailPanel from '@/components/RunDetailPanel';
import useActivities from '@/hooks/useActivities';
import NotFound from '@/pages/404';

const RunDetail = () => {
  const { runId } = useParams();
  const runIdNumber = Number(runId);
  const { activities } = useActivities();

  const run = useMemo(() => {
    if (!runId || Number.isNaN(runIdNumber)) return null;
    return activities.find((r) => r.run_id === runIdNumber) ?? null;
  }, [activities, runId, runIdNumber]);

  if (!runId || Number.isNaN(runIdNumber) || !run) {
    return <NotFound />;
  }

  return (
    <Layout>
      <div className="max-w-[480px] mx-auto">
        <div className="w-full text-center">
          <RunPolyline run={run} />
        </div>
        <RunDetailPanel run={run} />
      </div>
    </Layout>
  );
};

export default RunDetail;
