import React, { lazy, Suspense, useEffect, useState } from 'react';
import { totalStat, gridStats } from '@assets/index';
import { loadSvgComponent } from '@/utils/svgUtils';

const GridSvgTotal = lazy(() => loadSvgComponent(totalStat, './grid.svg'));

const TracksGrid = ({ year }: { year: string }) => {
  const [YearGridSvg, setYearGridSvg] = useState<React.ComponentType<any> | null>(null);

  useEffect(() => {
    if (year !== 'Total') {
      const loadSvg = async () => {
        const component = await loadSvgComponent(gridStats, `./grid_${year}.svg`);
        setYearGridSvg(() => component.default);
      };
      loadSvg();
    } else {
      setYearGridSvg(null);
    }
  }, [year]);

  return (
    <div className="w-full py-6">
      <Suspense fallback={<div>Loading tracks...</div>}>
        {year === 'Total' ? (
          <GridSvgTotal className="w-full h-auto" />
        ) : YearGridSvg ? (
          <YearGridSvg className="w-full h-auto" />
        ) : (
          <div>Loading...</div>
        )}
      </Suspense>
    </div>
  );
};

export default TracksGrid;
