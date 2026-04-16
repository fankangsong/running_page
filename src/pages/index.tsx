import { useEffect, useMemo, useState, useRef } from 'react';
import Layout from '@/components/Layout';
import RunMap from '@/components/RunMap';
import MonthlyBarChart from '@/components/MonthlyBarChart';
import CompactRunCalendar from '@/components/CompactRunCalendar';
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
    <Layout fullWidth>
      <div className="relative w-full h-[calc(100vh-64px)] flex overflow-hidden">
        <div
          id="run-map"
          className="absolute inset-0 bg-background z-0"
        >
          <RunMap
            viewState={viewState}
            geoData={geoData}
            setViewState={setViewState}
            changeYear={(y) => changeYearMonth(y, month)}
            thisYear={year}
          />
        </div>

        <div className="absolute right-0 top-0 bottom-0 w-full md:w-[400px] lg:right-6 lg:top-6 lg:bottom-6 p-4 lg:p-0 z-10 pointer-events-none flex flex-col justify-end lg:justify-start overflow-hidden">
          <div className="pointer-events-auto bg-card/90 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-white/10 flex flex-col w-full max-h-[60%] lg:max-h-full">
            <div className="overflow-y-auto overflow-x-hidden custom-scrollbar p-4 lg:p-6 w-full h-full flex-1">
              <CompactRunCalendar
                year={year}
                month={month}
                years={years}
                runsByDate={runsByDate}
                onChangeYearMonth={changeYearMonth}
                onSelectRunIds={(ids) => locateActivity(ids)}
                selectedDate={selectedDate}
              />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Index;
