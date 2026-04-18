import { useEffect, useMemo, useState, useRef } from 'react';
import Layout from '@/components/Layout';
import RunMap from '@/components/RunMap';
import MonthlyBarChart from '@/components/MonthlyBarChart';
import RunListSidebar from '@/components/RunListSidebar';
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
  isRun,
} from '@/utils/utils';

const pad2 = (n: number) => String(n).padStart(2, '0');
const SHENZHEN_VIEW_STATE: IViewState = {
  longitude: 114.0579,
  latitude: 22.5431,
  zoom: 10.5,
};

const Maps = () => {
  const { activities, thisYear, years } = useActivities();

  const { availableYearMonths, availableYearMonthList } = useMemo(() => {
    const yearMonths: Record<string, Set<number>> = {};
    
    activities.forEach((run) => {
      if (!isRun(run.type)) return;
      const dateStr = run.start_date_local;
      if (!dateStr) return;
      
      const y = dateStr.slice(0, 4);
      const m = parseInt(dateStr.slice(5, 7), 10);
      
      if (!yearMonths[y]) {
        yearMonths[y] = new Set();
      }
      yearMonths[y].add(m);
    });

    const result: Record<string, number[]> = {};
    const list: { year: string; month: number }[] = [];

    // Sort years descending
    const sortedYears = Object.keys(yearMonths).sort((a, b) => Number(b) - Number(a));
    
    sortedYears.forEach((y) => {
      // Sort months descending
      const sortedMonths = Array.from(yearMonths[y]).sort((a, b) => b - a);
      result[y] = sortedMonths;
      
      sortedMonths.forEach((m) => {
        list.push({ year: y, month: m });
      });
    });

    return { availableYearMonths: result, availableYearMonthList: list };
  }, [activities]);

  const initialSelection = availableYearMonthList.length > 0 
    ? availableYearMonthList[0] 
    : { year: thisYear, month: new Date().getMonth() + 1 };

  const [year, setYear] = useState(initialSelection.year);
  const [month, setMonth] = useState<number>(initialSelection.month);
  const [runs, setActivity] = useState(
    filterAndSortRuns(
      activities,
      `${initialSelection.year}-${pad2(initialSelection.month)}`,
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
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
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
    setSelectedRunId(null);
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
    
    if (runIds.length === 1) {
      setSelectedRunId(runIds[0]);
    } else {
      setSelectedRunId(null);
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
    <Layout fullWidth hideFooter>
      <div className="relative w-full h-[calc(100vh-72px)] md:h-[calc(100vh-64px)] flex overflow-hidden">
        <div id="run-map" className="absolute inset-0 bg-background z-0">
          <RunMap
            viewState={viewState}
            geoData={geoData}
            setViewState={setViewState}
            changeYear={(y) => changeYearMonth(y, month)}
            thisYear={year}
          />
        </div>

        <div className="absolute left-0 top-0 bottom-0 w-full md:w-auto lg:left-20 lg:top-6 lg:bottom-10 p-4 lg:p-0 z-10 pointer-events-none flex flex-col justify-end lg:justify-start">
          <RunListSidebar
            runs={runs}
            year={year}
            month={month}
            years={years}
            onChangeYearMonth={changeYearMonth}
            onSelectRun={(runId) => locateActivity([runId])}
            selectedRunId={selectedRunId}
            availableYearMonths={availableYearMonths}
            availableYearMonthList={availableYearMonthList}
          />
        </div>
      </div>
    </Layout>
  );
};

export default Maps;
