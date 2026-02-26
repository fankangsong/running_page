import React, { Suspense, useEffect, useState } from 'react';
import { githubStats, totalStat } from '@assets/index';
import { loadSvgComponent } from '@/utils/svgUtils';

const FailedLoadSvg = ({ fileName }: { fileName: string }) => (
  <div className="text-gray-500 text-center py-8">Failed to load {fileName}</div>
);

const RunningCalendar = ({ year }: { year: string }) => {
  const [CalendarSVG, setCalendarSVG] = useState<React.ComponentType<any> | null>(null);

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
        setCalendarSVG(() => () => <FailedLoadSvg fileName={fileName} />);
      }
    };
    loadSvg();
  }, [year]);

  if (!CalendarSVG) {
    return <div className="text-gray-500 text-center py-8">Loading calendar...</div>;
  }

  return (
    <div className="w-full overflow-x-auto scrollbar-hide">
      <Suspense fallback={<div>Loading...</div>}>
        <CalendarSVG className="w-full h-auto" />
      </Suspense>
    </div>
  );
};

export default RunningCalendar;
