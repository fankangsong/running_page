import React, { Suspense, useEffect, useState } from 'react';
import { githubStats, totalStat } from '@assets/index';
import { loadSvgComponent } from '@/utils/svgUtils';

const FailedLoadSvg = ({ fileName }: { fileName: string }) => (
  <div className="text-gray-500 text-center py-8">Failed to load {fileName}</div>
);

const RunningCalendar = ({ year }: { year: string }) => {
  const [CalendarSVG, setCalendarSVG] = useState<React.ComponentType<any> | null>(null);
  const LoadingPlaceholder = () => (
    <div className="w-full min-h-[110px] flex items-center justify-center bg-gray-900/60">
      <div className="h-10 w-10 rounded-full border-2 border-gray-600 border-t-white animate-spin" />
    </div>
  );

  useEffect(() => {
    const loadSvg = async () => {
      let component;
      const fileName = year === 'Total' ? 'github.svg' : `github_${year}.svg`;
      try {
        if (year === 'Total') {
          component = await loadSvgComponent(totalStat, './github.svg');
        } else {
          component = await loadSvgComponent(githubStats, `./github_${year}.svg`);
        }
        
        // Check if component is a module with default export or the component itself
        // When using import.meta.glob with { import: 'ReactComponent' }, component is the component itself
        if (component && typeof component === 'object' && 'default' in component) {
            setCalendarSVG(() => component.default);
        } else {
            setCalendarSVG(() => component);
        }
      } catch (error) {
        console.error('Failed to load SVG:', error);
        const FailedLoadComponent = () => <FailedLoadSvg fileName={fileName} />;
        setCalendarSVG(() => FailedLoadComponent);
      }
    };
    loadSvg();
  }, [year]);

  if (!CalendarSVG) {
    return <LoadingPlaceholder />;
  }

  return (
    <div className="w-full overflow-x-auto scrollbar-hide min-h-[110px]">
      <Suspense fallback={<LoadingPlaceholder />}>
        <CalendarSVG className="w-full h-auto" />
      </Suspense>
    </div>
  );
};

export default RunningCalendar;
