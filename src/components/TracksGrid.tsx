import React, { useEffect, useRef, useState } from 'react';
import { totalStat, gridStats } from '@assets/index';
import { loadSvgComponent } from '@/utils/svgUtils';

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

      if (component && typeof component === 'object' && 'default' in component) {
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
      {isReady ? <GridSvg className="w-full h-auto" /> : <div className="min-h-[360px]" />}
    </div>
  );
};

export default TracksGrid;
