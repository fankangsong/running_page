import React, { lazy, Suspense, useEffect, useState } from 'react';
import { totalStat, gridStats } from '@assets/index';
import { loadSvgComponent } from '@/utils/svgUtils';

const GridSvgTotal = lazy(() => loadSvgComponent(totalStat, './grid.svg'));

const TracksGrid = ({ year }: { year: string }) => {
  const [YearGridSvg, setYearGridSvg] = useState<React.ComponentType<any> | null>(null);
  const [loading, setLoading] = useState(false);
  const LoadingPlaceholder = () => (
    <div className="w-full min-h-[360px] flex items-center justify-center bg-gray-900/60">
      <div className="h-10 w-10 rounded-full border-2 border-gray-600 border-t-white animate-spin" />
    </div>
  );

  useEffect(() => {
    if (year !== 'Total') {
      const loadSvg = async () => {
        setLoading(true);
        const component = await loadSvgComponent(gridStats, `./grid_${year}.svg`);
        setYearGridSvg(() => component.default);
        setLoading(false);
      };
      loadSvg();
    } else {
      setYearGridSvg(null);
    }
  }, [year]);

  return (
    <div className="w-full py-6">
      <Suspense fallback={<LoadingPlaceholder />}>
        {year === 'Total' ? (
          <GridSvgTotal className="w-full h-auto" />
        ) : YearGridSvg ? (
          <YearGridSvg className="w-full h-auto" />
        ) : loading ? (
          <LoadingPlaceholder />
        ) : (
          <LoadingPlaceholder />
        )}
      </Suspense>
    </div>
  );
};

export default TracksGrid;
