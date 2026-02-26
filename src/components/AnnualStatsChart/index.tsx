import React, { Suspense, useEffect, useState } from 'react';
import { yearStats } from '@assets/index';
import { loadSvgComponent } from '@/utils/svgUtils';

const FailedLoadSvg = ({ fileName }: { fileName: string }) => (
  <div className="h-full flex items-center justify-center text-gray-500">
    Failed to load {fileName}
  </div>
);

const AnnualStatsChart = ({ year }: { year: string }) => {
  const [YearSVG, setYearSVG] = useState<React.ComponentType<any> | null>(null);

  useEffect(() => {
    const loadSvg = async () => {
      const fileName = `year_${year}.svg`;
      try {
        const component = await loadSvgComponent(yearStats, `./${fileName}`);
        if (component && typeof component === 'object' && 'default' in component) {
          setYearSVG(() => (component as any).default);
        } else {
          setYearSVG(() => component as any);
        }
      } catch (error) {
        console.error('Failed to load SVG:', error);
        setYearSVG(() => () => <FailedLoadSvg fileName={fileName} />);
      }
    };
    loadSvg();
  }, [year]);

  if (!YearSVG) {
    return <div className="h-full flex items-center justify-center text-gray-500">Loading...</div>;
  }

  return (
    <div className="w-full h-full flex items-center justify-center">
      <Suspense fallback={<div>Loading...</div>}>
        <YearSVG className="w-full h-full" />
      </Suspense>
    </div>
  );
};

export default AnnualStatsChart;
