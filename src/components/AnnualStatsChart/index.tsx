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
  const [loading, setLoading] = useState(false);
  const LoadingPlaceholder = () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-900/60">
      <div className="h-10 w-10 rounded-full border-2 border-gray-600 border-t-white animate-spin" />
    </div>
  );

  useEffect(() => {
    const loadSvg = async () => {
      const fileName = `year_${year}.svg`;
      try {
        setLoading(true);
        const component = await loadSvgComponent(yearStats, `./${fileName}`);
        if (component && typeof component === 'object' && 'default' in component) {
          setYearSVG(() => (component as any).default);
        } else {
          setYearSVG(() => component as any);
        }
      } catch (error) {
        console.error('Failed to load SVG:', error);
        const FailedLoadComponent = () => <FailedLoadSvg fileName={fileName} />;
        setYearSVG(() => FailedLoadComponent);
      } finally {
        setLoading(false);
      }
    };
    loadSvg();
  }, [year]);

  if (!YearSVG || loading) {
    return <LoadingPlaceholder />;
  }

  return (
    <div className="w-full h-full flex items-center justify-center">
      <Suspense fallback={<LoadingPlaceholder />}>
        <YearSVG className="w-full h-full" />
      </Suspense>
    </div>
  );
};

export default AnnualStatsChart;
