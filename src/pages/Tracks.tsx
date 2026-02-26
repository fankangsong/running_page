import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import TracksGrid from '@/components/TracksGrid';
import TracksStats from '@/components/TracksStats';
import useActivities from '@/hooks/useActivities';
import { filterAndSortRuns, filterYearRuns, sortDateFunc } from '@/utils/utils';

const Tracks = () => {
  const { activities, years } = useActivities();
  const [year, setYear] = useState('Total');
  const [runs, setRuns] = useState(activities);

  useEffect(() => {
     setRuns(filterAndSortRuns(activities, year, filterYearRuns, sortDateFunc));
  }, [year, activities]);

  return (
    <Layout>
      <div className="grid grid-cols-1 gap-6 p-4 lg:p-6">
        <div className="bg-card rounded-card p-6 shadow-lg border border-gray-800/50">
          <div className="flex flex-wrap gap-2 justify-start">
            <button
              className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all duration-200 ${
                year === 'Total'
                  ? 'bg-accent text-white shadow-md shadow-accent/20'
                  : 'bg-gray-800 text-secondary hover:bg-gray-700 hover:text-primary'
              }`}
              onClick={() => setYear('Total')}
              type="button"
            >
              Total
            </button>
            {years.map((y) => (
              <button
                key={y}
                className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all duration-200 ${
                  year === y
                    ? 'bg-accent text-white shadow-md shadow-accent/20'
                    : 'bg-gray-800 text-secondary hover:bg-gray-700 hover:text-primary'
                }`}
                onClick={() => setYear(y)}
                type="button"
              >
                {y}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
          <div className="lg:col-span-3 bg-card rounded-card p-6 shadow-lg border border-gray-800/50">
            <TracksStats runs={runs} year={year} />
          </div>
          <div className="lg:col-span-7 bg-card rounded-card shadow-lg border border-gray-800/50 overflow-hidden">
            <TracksGrid year={year} />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Tracks;
