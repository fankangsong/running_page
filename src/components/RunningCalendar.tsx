import React, { Suspense, useEffect, useRef, useState } from 'react';
import { githubStats, totalStat } from '@assets/index';
import { loadSvgComponent } from '@/utils/svgUtils';

const FailedLoadSvg = ({ fileName }: { fileName: string }) => (
  <div className="text-gray-500 text-center py-8">Failed to load {fileName}</div>
);

const RunningCalendar = ({ year }: { year: string }) => {
  const [CalendarSVG, setCalendarSVG] = useState<React.ComponentType<any> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const requestIdRef = useRef(0);
  const LoadingPlaceholder = () => (
    <div className="w-full min-h-[110px] flex items-center justify-center bg-gray-900/60">
      <div className="h-10 w-10 rounded-full border-2 border-gray-600 border-t-white animate-spin" />
    </div>
  );

  useEffect(() => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setIsLoading(true);
    const loadSvg = async () => {
      let component;
      const fileName = year === 'Total' ? 'github.svg' : `github_${year}.svg`;
      try {
        if (year === 'Total') {
          component = await loadSvgComponent(totalStat, './github.svg');
        } else {
          component = await loadSvgComponent(githubStats, `./github_${year}.svg`);
        }

        if (requestIdRef.current !== requestId) return;
        if (component && typeof component === 'object' && 'default' in component) {
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

  if (!CalendarSVG) {
    return <LoadingPlaceholder />;
  }

  return (
    <div className="w-full overflow-x-auto scrollbar-hide min-h-[110px] relative">
      <Suspense fallback={<LoadingPlaceholder />}>
        <div className={isLoading ? 'opacity-70 transition-opacity duration-150' : 'opacity-100 transition-opacity duration-150'}>
          <CalendarSVG className="w-full h-auto" />
        </div>
      </Suspense>
    </div>
  );
};

export default RunningCalendar;
