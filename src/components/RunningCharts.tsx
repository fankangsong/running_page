import React, { Suspense, useEffect, useRef, useState } from 'react';
import { githubStats, totalStat, gridStats } from '@assets/index';
import { loadSvgComponent } from '@/utils/svgUtils';

const FailedLoadSvg = ({ fileName }: { fileName: string }) => (
  <div className="text-gray-500 text-center py-8">
    Failed to load {fileName}
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
  const [isLoading, setIsLoading] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsLoading(true);
    const loadSvg = async () => {
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
        setIsLoading(false);
      } catch (error) {
        if (requestIdRef.current !== requestId) return;
        console.error('Failed to load SVG:', error);
        const FailedLoadComponent = () => <FailedLoadSvg fileName={fileName} />;
        setCalendarSVG(() => FailedLoadComponent);
        setIsLoading(false);
      }
    };
    loadSvg();
  }, [year]);

  if (year === 'Total') {
    return null;
  }

  if (!CalendarSVG) {
    return <LoadingPlaceholder />;
  }

  return (
    <div className="w-full overflow-x-auto scrollbar-hide min-h-[110px] relative">
      <Suspense fallback={<LoadingPlaceholder />}>
        <div
          className={
            isLoading
              ? 'opacity-70 transition-opacity duration-150'
              : 'opacity-100 transition-opacity duration-150'
          }
        >
          <CalendarSVG className="w-full h-auto" />
        </div>
      </Suspense>
    </div>
  );
};

const TracksGrid = ({ year }: { year: string }) => {
  const [GridSvg, setGridSvg] = useState<React.ComponentType<any> | null>(null);
  const [loadedYear, setLoadedYear] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    const loadSvg = async () => {
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
    };

    loadSvg();
  }, [year]);

  const isReady = loadedYear === year && GridSvg;

  return (
    <div className="w-full py-6 min-h-[360px] relative">
      {isReady ? (
        <GridSvg className="w-full h-auto" />
      ) : (
        <div className="min-h-[360px]" />
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
