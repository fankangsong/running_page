import React, { Suspense, useEffect, useRef, useState } from 'react';
import { githubStats, totalStat, gridStats } from '@assets/index';
import { loadSvgComponent } from '@/utils/svgUtils';

const FailedLoadSvg = () => (
  <div className="text-gray-500 text-center py-8">
  </div>
);

const LoadingPlaceholder = () => (
  <div className="w-full min-h-[110px] flex items-center justify-center bg-gray-900/60">
    <div className="h-10 w-10 rounded-full border-2 border-gray-600 border-t-white animate-spin" />
  </div>
);

const RunningCalendar = ({ year }: { year: string }) => {
  const [CalendarSVG, setCalendarSVG] =
    useState<React.ComponentType<any> | null>(null);
  const [renderYear, setRenderYear] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const requestIdRef = useRef(0);
  const switchTimerRef = useRef<number | null>(null);

  useEffect(() => {
    requestIdRef.current += 1;
    const requestId = requestIdRef.current;
    if (switchTimerRef.current !== null) {
      window.clearTimeout(switchTimerRef.current);
      switchTimerRef.current = null;
    }
    setCalendarSVG(null);
    setRenderYear(null);
    setIsLoading(true);
    if (year === 'Total') {
      setIsLoading(false);
      return;
    }
    switchTimerRef.current = window.setTimeout(async () => {
      let component;
      const fileName = `github_${year}.svg`;
      try {
        component = await loadSvgComponent(githubStats, `./github_${year}.svg`);
        if (requestIdRef.current !== requestId) return;
        if (
          component &&
          typeof component === 'object' &&
          'default' in component
        ) {
          setCalendarSVG(() => component.default);
        } else {
          setCalendarSVG(() => component);
        }
        setRenderYear(year);
        setIsLoading(false);
      } catch (error) {
        if (requestIdRef.current !== requestId) return;
        console.error('Failed to load SVG:', error);
        const FailedLoadComponent = () => <FailedLoadSvg />;
        setCalendarSVG(() => FailedLoadComponent);
        setRenderYear(year);
        setIsLoading(false);
      }
    }, 80);
    return () => {
      if (switchTimerRef.current !== null) {
        window.clearTimeout(switchTimerRef.current);
        switchTimerRef.current = null;
      }
      requestIdRef.current += 1;
    };
  }, [year]);

  if (year === 'Total') {
    return null;
  }

  const isReady = renderYear === year && CalendarSVG && !isLoading;

  if (!isReady) {
    return <LoadingPlaceholder />;
  }

  return (
    <div className="w-full overflow-x-auto scrollbar-hide min-h-[110px] relative">
      <Suspense fallback={<LoadingPlaceholder />}>
        <CalendarSVG key={year} className="w-full h-auto" />
      </Suspense>
    </div>
  );
};

const TracksGrid = ({ year }: { year: string }) => {
  const [GridSvg, setGridSvg] = useState<React.ComponentType<any> | null>(null);
  const [loadedYear, setLoadedYear] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const requestIdRef = useRef(0);
  const switchTimerRef = useRef<number | null>(null);

  useEffect(() => {
    requestIdRef.current += 1;
    const requestId = requestIdRef.current;
    if (switchTimerRef.current !== null) {
      window.clearTimeout(switchTimerRef.current);
      switchTimerRef.current = null;
    }
    setGridSvg(null);
    setLoadedYear(null);
    setIsLoading(true);
    switchTimerRef.current = window.setTimeout(async () => {
      try {
        const isTotal = year === 'Total';
        const component = await loadSvgComponent(
          isTotal ? totalStat : gridStats,
          isTotal ? './grid.svg' : `./grid_${year}.svg`
        );
        if (requestIdRef.current !== requestId) return;
        if (
          component &&
          typeof component === 'object' &&
          'default' in component
        ) {
          setGridSvg(() => component.default);
        } else {
          setGridSvg(() => component);
        }
        setLoadedYear(year);
        setIsLoading(false);
      } catch (error) {
        if (requestIdRef.current !== requestId) return;
        console.error('Failed to load SVG:', error);
        setIsLoading(false);
      }
    }, 80);
    return () => {
      if (switchTimerRef.current !== null) {
        window.clearTimeout(switchTimerRef.current);
        switchTimerRef.current = null;
      }
      requestIdRef.current += 1;
    };
  }, [year]);

  const isReady = loadedYear === year && GridSvg && !isLoading;

  return (
    <div className="w-full py-6 min-h-[360px] relative">
      {isReady ? (
        <GridSvg key={year} className="w-full h-auto" />
      ) : (
        <LoadingPlaceholder />
      )}
    </div>
  );
};

const RunningCharts = ({ year }: { year: string }) => {
  return (
    <>
      <RunningCalendar year={year} />
      <TracksGrid year={year} />
    </>
  );
};

export default RunningCharts;
