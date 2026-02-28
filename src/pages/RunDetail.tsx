import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '@/components/Layout';
import RunMap from '@/components/RunMap';
import RunDetailPanel from '@/components/RunDetailPanel';
import useActivities from '@/hooks/useActivities';
import NotFound from '@/pages/404';
import { geoJsonForRuns, getBoundsForGeoData, IViewState, titleForShow } from '@/utils/utils';

const RunDetail = () => {
  const { runId } = useParams();
  const runIdNumber = Number(runId);
  const { activities } = useActivities();

  const run = useMemo(() => {
    if (!runId || Number.isNaN(runIdNumber)) return null;
    return activities.find((r) => r.run_id === runIdNumber) ?? null;
  }, [activities, runId, runIdNumber]);

  const geoData = useMemo(() => {
    return run ? geoJsonForRuns([run]) : geoJsonForRuns([]);
  }, [run]);

  const bounds = useMemo(() => getBoundsForGeoData(geoData), [geoData]);
  const [viewState, setViewState] = useState<IViewState>({ ...bounds });

  useEffect(() => {
    setViewState({ ...bounds });
  }, [bounds.latitude, bounds.longitude, bounds.zoom]);

  if (!runId || Number.isNaN(runIdNumber) || !run) {
    return <NotFound />;
  }

  const title = titleForShow(run);

  return (
    <Layout>
      <div className="max-w-[480px] mx-auto">
          <div className="bg-card rounded-card shadow-lg 
          border border-gray-800/50 overflow-hidden 
          relative w-full sm:max-w-[420px] mx-auto aspect-square">
            <RunMap
              title={title}
              viewState={viewState}
              geoData={geoData}
              setViewState={setViewState}
            />
          </div>
          <RunDetailPanel run={run} />
        </div>
    </Layout>
  );
};

export default RunDetail;
