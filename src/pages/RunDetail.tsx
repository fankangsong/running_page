import { useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '@/components/Layout';
import RunPolyline from '@/components/RunPolyline';
import RunDetailPanel from '@/components/RunDetailPanel';
import ActivityCurves from '@/components/ActivityCurves';
import KmSplitsTable from '@/components/KmSplitsTable';
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

  const { monthlyDistanceKm, monthRunDates } = useMemo(() => {
    if (!run?.start_date_local) return { monthlyDistanceKm: 0, monthRunDates: [] };
    const yearMonth = run.start_date_local.slice(0, 7);
    let monthDistance = 0;
    const runDates = new Set<string>();

    activities.forEach((activity) => {
      if (!isRun(activity.type)) return;
      if (activity.start_date_local.slice(0, 7) === yearMonth) {
        monthDistance += activity.distance;
        runDates.add(activity.start_date_local.slice(0, 10));
      }
    });
    
    return {
      monthlyDistanceKm: monthDistance / 1000,
      monthRunDates: Array.from(runDates),
    };
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
        {/* First screen - Core metrics */}
        <div className="flex justify-center items-center ">
          <RunPolyline run={run} className="w-[210px] h-[210px]" />
        </div>
        <RunDetailPanel
          run={run}
          monthlyDistanceKm={monthlyDistanceKm}
          monthRunDates={monthRunDates}
        />

        {/* Second screen - Curves and splits */}
        {isRun(run.type) && (run.streams?.heartrate || run.streams?.velocity_smooth || run.streams?.altitude) && (
          <div className="mt-4 bg-card rounded-card shadow-lg border border-gray-800/50 p-4 md:p-6 mx-auto sm:max-w-[480px]">
            <ActivityCurves
              streams={run.streams}
              totalDistance={run.distance}
            />
          </div>
        )}

        {/* Second screen - Splits table */}
        {isRun(run.type) && (run.laps && run.laps.length > 0) && (
          <div className="mt-4 bg-card rounded-card shadow-lg border border-gray-800/50 p-4 md:p-6 mx-auto sm:max-w-[480px]">
            <span className="font-sans text-[9px] md:text-[10px] font-bold text-secondary uppercase tracking-wider mb-3 block text-center">
              分段数据
            </span>
            <KmSplitsTable
              laps={run.laps}
              streams={run.streams}
              totalDistance={run.distance}
            />
          </div>
        )}
      </div>
    </Layout>
  );
};

export default RunDetail;
