import { useEffect, useMemo, useState } from 'react';
import Layout from '@/components/Layout';
import RunMap from '@/components/RunMap';
import RunListSidebar from '@/components/RunListSidebar';
import useActivities from '@/hooks/useActivities';
import {
  IViewState,
  geoJsonForRuns,
  getBoundsForGeoData,
  sortDateFunc,
  titleForShow,
  RunIds,
  HIKE_TYPE,
  WALK_TYPE,
  RIDE_TYPE,
  VIRTUAL_RIDE_TYPE,
} from '@/utils/utils';

const Hiking = () => {
  const { activities } = useActivities();

  // 过滤出徒步、步行、骑行和虚拟骑行的活动，并按日期倒序排序
  const hikes = useMemo(() => {
    return activities
      .filter((activity) => 
        activity.type === HIKE_TYPE || 
        activity.type === WALK_TYPE || 
        activity.type === RIDE_TYPE || 
        activity.type === VIRTUAL_RIDE_TYPE
      )
      .sort(sortDateFunc);
  }, [activities]);

  const [geoData, setGeoData] = useState(geoJsonForRuns(hikes));
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);

  const getMapViewState = (nextGeoData: typeof geoData): IViewState => {
    const hasTrack = nextGeoData.features.some(
      (feature) => feature.geometry.coordinates.length > 0
    );
    if (!hasTrack) {
      return { longitude: 114.0579, latitude: 22.5431, zoom: 10.5 }; // 默认深圳视图
    }
    return getBoundsForGeoData(nextGeoData);
  };

  const [viewState, setViewState] = useState<IViewState>({
    ...getMapViewState(geoData),
  });

  const locateActivity = (runIds: RunIds) => {
    const ids = new Set(runIds);
    const selectedRuns = !runIds.length ? hikes : hikes.filter((r) => ids.has(r.run_id));
    if (!selectedRuns.length) return;

    setSelectedRunId(runIds.length === 1 ? runIds[0] : null);
    
    const nextGeo = geoJsonForRuns(selectedRuns);
    setGeoData(nextGeo);
    setViewState(getMapViewState(nextGeo));
  };

  useEffect(() => {
    const fullGeo = geoJsonForRuns(hikes);
    setGeoData(fullGeo);
    setViewState(getMapViewState(fullGeo));
  }, [hikes]);

  return (
    <Layout fullWidth hideFooter>
      <div className="relative w-full h-[calc(100vh-72px)] md:h-[calc(100vh-64px)] flex overflow-hidden">
        <div id="run-map" className="absolute inset-0 bg-background z-0">
          <RunMap
            viewState={viewState}
            geoData={geoData}
            setViewState={setViewState}
          />
        </div>

        <div className="absolute left-0 top-0 bottom-0 w-full md:w-auto lg:left-20 lg:top-6 lg:bottom-10 p-4 lg:p-0 z-10 pointer-events-none flex flex-col justify-end lg:justify-start">
          <RunListSidebar
            runs={hikes}
            onSelectRun={(runId) => locateActivity([runId])}
            selectedRunId={selectedRunId}
            showFilter={false}
            title="HIKE & RIDE"
            emptyText="No hiking, walking or riding activities found."
            icon={
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M16 12l-4-4-4 4M12 8v8" />
              </svg>
            }
          />
        </div>
      </div>
    </Layout>
  );
};

export default Hiking;