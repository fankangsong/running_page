import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import TracksGrid from '@/components/TracksGrid';
import TracksStats from '@/components/TracksStats';
import useActivities from '@/hooks/useActivities';
import { filterAndSortRuns, filterYearRuns, filterCityRuns, sortDateFunc } from '@/utils/utils';

const Tracks = () => {
  const { activities, years } = useActivities();
  const [year, setYear] = useState('Total');
  const [runs, setRuns] = useState(activities);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  useEffect(() => {
    let filtered = filterAndSortRuns(activities, year, filterYearRuns, sortDateFunc);
    if (selectedCity && selectedCity.length > 0) {
      filtered = filtered.filter((r) => filterCityRuns(r, selectedCity as string));
      filtered.sort(sortDateFunc);
    }
    setRuns(filtered);
  }, [year, activities, selectedCity]);

  const handleSelectCity = (city: string) => {
    if (!city) {
      setSelectedCity(null);
      return;
    }
    setSelectedCity((prev) => (prev === city ? null : city));
  };

  return (
    <Layout>
      <div className="p-4 lg:p-6 space-y-6">
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

        <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
          <div className="lg:col-span-3">
            <TracksStats runs={runs} year={year} onSelectCity={handleSelectCity} selectedCity={selectedCity} topN={12} />
          </div>
          <div className="lg:col-span-7">
            <TracksGrid year={year} />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Tracks;
