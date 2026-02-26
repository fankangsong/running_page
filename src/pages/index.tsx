import { useEffect, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import Layout from '@/components/Layout';
import RunMap from '@/components/RunMap';
import DashboardStats from '@/components/DashboardStats';
import ActivityList from '@/components/ActivityList';
import AnnualStatsChart from '@/components/AnnualStatsChart';
import useActivities from '@/hooks/useActivities';
import useSiteMetadata from '@/hooks/useSiteMetadata';
import {
  Activity,
  IViewState,
  filterAndSortRuns,
  filterCityRuns,
  filterTitleRuns,
  filterYearRuns,
  geoJsonForRuns,
  getBoundsForGeoData,
  scrollToMap,
  sortDateFunc,
  titleForShow,
  RunIds,
} from '@/utils/utils';

const Index = () => {
  const { activities, thisYear } = useActivities();
  const [year, setYear] = useState(thisYear);
  const [runIndex, setRunIndex] = useState(-1);
  const [runs, setActivity] = useState(
    filterAndSortRuns(activities, year, filterYearRuns, sortDateFunc)
  );
  const [title, setTitle] = useState('');
  const [geoData, setGeoData] = useState(geoJsonForRuns(runs));
  // for auto zoom
  const bounds = getBoundsForGeoData(geoData);
  const [intervalId, setIntervalId] = useState<number>();

  const [viewState, setViewState] = useState<IViewState>({
    ...bounds,
  });

  const changeByItem = (
    item: string,
    name: string,
    func: (_run: Activity, _value: string) => boolean
  ) => {
    scrollToMap();
    if (name !== 'Year') {
      setYear(thisYear)
    }
    setActivity(filterAndSortRuns(activities, item, func, sortDateFunc));
    setRunIndex(-1);
    setTitle(`${item} ${name} Running Heatmap`);
  };

  const changeYear = (y: string) => {
    // default year
    setYear(y);

    if ((viewState.zoom ?? 0) > 3 && bounds) {
      setViewState({
        ...bounds,
      });
    }

    changeByItem(y, 'Year', filterYearRuns);
    clearInterval(intervalId);
  };

  const changeCity = (city: string) => {
    changeByItem(city, 'City', filterCityRuns);
  };

  const changeTitle = (title: string) => {
    changeByItem(title, 'Title', filterTitleRuns);
  };

  const locateActivity = (runIds: RunIds) => {
    const ids = new Set(runIds);

    const selectedRuns = !runIds.length
      ? runs
      : runs.filter((r: any) => ids.has(r.run_id));

    if (!selectedRuns.length) {
      return;
    }

    const lastRun = selectedRuns.sort(sortDateFunc)[0];

    if (!lastRun) {
      return;
    }
    setGeoData(geoJsonForRuns(selectedRuns));
    setTitle(titleForShow(lastRun));
    clearInterval(intervalId);
    scrollToMap();
  };

  useEffect(() => {
    setViewState({
      ...bounds,
    });
  }, [geoData]);

  useEffect(() => {
    const runsNum = runs.length;
    // maybe change 20 ?
    const sliceNume = runsNum >= 20 ? runsNum / 20 : 1;
    let i = sliceNume;
    const id = setInterval(() => {
      if (i >= runsNum) {
        clearInterval(id);
      }

      const tempRuns = runs.slice(0, i);
      setGeoData(geoJsonForRuns(tempRuns));
      i += sliceNume;
    }, 100);
    setIntervalId(id);
  }, [runs]);

  return (
    <Layout>
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 p-4 lg:p-6">
        {/* Left Column (6/10 width - 60%) */}
        <div className="lg:col-span-6 flex flex-col gap-6">
          {/* Row 1: Dashboard Stats */}
          <DashboardStats changeCity={changeCity} changeTitle={changeTitle} />
          
          {/* Row 2: Activity List (Calendar/Table) */}
          <ActivityList
            year={year}
            setYear={changeYear}
            runs={runs}
            locateActivity={locateActivity}
            setActivity={setActivity}
            runIndex={runIndex}
            setRunIndex={setRunIndex}
          />
        </div>

        {/* Right Column (4/10 width - 40%) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Row 1: Map */}
          <div id="run-map" className="bg-card rounded-card shadow-lg border border-gray-800/50 overflow-hidden relative w-full aspect-square">
            <RunMap
              title={title}
              viewState={viewState}
              geoData={geoData}
              setViewState={setViewState}
              changeYear={changeYear}
              thisYear={year}
            />
          </div>

          {/* Row 2: Annual Stats Chart */}
          <div className="bg-card rounded-card shadow-lg border border-gray-800/50 h-[400px] min-h-[400px] flex flex-col justify-center items-center overflow-hidden">
            <AnnualStatsChart year={year} />
          </div>
        </div>
      </div>
      {/* Enable Audiences in Vercel Analytics: https://vercel.com/docs/concepts/analytics/audiences/quickstart */}
      <Analytics />
    </Layout>
  );
};

export default Index;
