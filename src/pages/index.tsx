import { useEffect, useMemo, useState, useRef } from 'react';
import Layout from '@/components/Layout';
import RunMap from '@/components/RunMap';
import DashboardStats from '@/components/DashboardStats';
import MonthlyBarChart from '@/components/MonthlyBarChart';
import CompactRunCalendar from '@/components/CompactRunCalendar';
import ActivityCardList from '@/components/ActivityCardList';
import useActivities from '@/hooks/useActivities';
import {
  IViewState,
  filterAndSortRuns,
  filterYearRuns,
  filterYearMonthRuns,
  geoJsonForRuns,
  getBoundsForGeoData,
  groupRunsByDate,
  sortDateFunc,
  titleForShow,
  RunIds,
} from '@/utils/utils';

const pad2 = (n: number) => String(n).padStart(2, '0');
const SHENZHEN_VIEW_STATE: IViewState = {
  longitude: 114.0579,
  latitude: 22.5431,
  zoom: 10.5,
};

const Index = () => {
  const { activities, thisYear, years } = useActivities();
  const initialMonth = (() => {
    const thisYearRuns = filterAndSortRuns(
      activities,
      thisYear,
      filterYearRuns,
      sortDateFunc
    );
    const m = thisYearRuns[0]?.start_date_local?.slice(5, 7);
    const parsed = m ? Number(m) : NaN;
    if (parsed >= 1 && parsed <= 12) return parsed;
    return new Date().getMonth() + 1;
  })();
  const [year, setYear] = useState(thisYear);
  const [month, setMonth] = useState<number>(initialMonth);
  const [runs, setActivity] = useState(
    filterAndSortRuns(
      activities,
      `${thisYear}-${pad2(initialMonth)}`,
      filterYearMonthRuns,
      sortDateFunc
    )
  );
  const [title, setTitle] = useState('');
  const [geoData, setGeoData] = useState(geoJsonForRuns(runs));
  const getMapViewState = (nextGeoData: typeof geoData): IViewState => {
    const hasTrack = nextGeoData.features.some(
      (feature) => feature.geometry.coordinates.length > 0
    );
    if (!hasTrack) {
      return SHENZHEN_VIEW_STATE;
    }
    return getBoundsForGeoData(nextGeoData);
  };
  const [intervalId, setIntervalId] = useState<number>();
  const [selectedDate, setSelectedDate] = useState<string>('');
  const runsByDate = useMemo(() => groupRunsByDate(runs), [runs]);
  const pendingRunIdRef = useRef<number | null>(null);

  const [viewState, setViewState] = useState<IViewState>({
    ...getMapViewState(geoData),
  });

  const changeYearMonth = (y: string, m: number) => {
    setYear(y);
    setMonth(m);
    const ym = `${y}-${pad2(m)}`;
    setActivity(
      filterAndSortRuns(activities, ym, filterYearMonthRuns, sortDateFunc)
    );
    setTitle(`${ym} Running Heatmap`);
    clearInterval(intervalId);
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
    const nextGeo = geoJsonForRuns(selectedRuns);
    setGeoData(nextGeo);
    setViewState({
      ...getMapViewState(nextGeo),
    });
    setTitle(titleForShow(lastRun));
    clearInterval(intervalId);
  };

  const handleClickPB = (run: any) => {
    const date = run.start_date_local;
    const y = date.slice(0, 4);
    const m = parseInt(date.slice(5, 7));
    changeYearMonth(y, m);
    setSelectedDate(date.slice(0, 10));
    pendingRunIdRef.current = run.run_id;
  };

  useEffect(() => {
    const fullGeo = geoJsonForRuns(runs);
    if (pendingRunIdRef.current) {
      const targetRun = runs.find((r) => r.run_id === pendingRunIdRef.current);
      if (targetRun) {
        locateActivity([pendingRunIdRef.current]);
        pendingRunIdRef.current = null;
        return;
      }
    }
    setViewState({
      ...getMapViewState(fullGeo),
    });
    const runsNum = runs.length;
    // maybe change 20 ?
    const sliceNume = runsNum >= 20 ? runsNum / 20 : 1;
    if (runsNum === 0) {
      setGeoData(fullGeo);
      return;
    }
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
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6 lg:p-6">
        <div className="lg:col-span-10">
          <DashboardStats onClickPB={handleClickPB} />
        </div>

        <div className="lg:col-span-6 flex flex-col">
          <div
            id="run-map"
            className="bg-card rounded-card shadow-lg border border-gray-800/50 overflow-hidden relative w-full h-full min-h-[400px] lg:min-h-[400px]"
          >
            <RunMap
              viewState={viewState}
              geoData={geoData}
              setViewState={setViewState}
              changeYear={(y) => changeYearMonth(y, month)}
              thisYear={year}
            />
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-6 overflow-x-hidden">
          <CompactRunCalendar
            year={year}
            month={month}
            years={years}
            runsByDate={runsByDate}
            onChangeYearMonth={changeYearMonth}
            onSelectRunIds={(ids) => locateActivity(ids)}
            selectedDate={selectedDate}
          />

          <div>
            <MonthlyBarChart
              runs={filterAndSortRuns(
                activities,
                year === 'Total' ? thisYear : year,
                filterYearRuns,
                sortDateFunc
              )}
              year={year === 'Total' ? thisYear : year}
              activeMonth={month}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Index;
