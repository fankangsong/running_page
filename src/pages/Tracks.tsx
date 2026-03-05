import { useState, useEffect, useRef } from 'react';
import type { TransitionEventHandler } from 'react';
import Layout from '@/components/Layout';
import TracksGrid from '@/components/TracksGrid';
import TracksStats from '@/components/TracksStats';
import RunningCalendar from '@/components/RunningCalendar';
import useActivities from '@/hooks/useActivities';
import {
  filterAndSortRuns,
  filterYearRuns,
  filterCityRuns,
  sortDateFunc,
} from '@/utils/utils';

const filterCountryRuns = (run: any, country: string) => {
  if (run && run.location_country) {
    return run.location_country.includes(country);
  }
  return false;
};

const filterProvinceRuns = (run: any, province: string) => {
  if (run && run.location_country) {
    return run.location_country.includes(province);
  }
  return false;
};

const Tracks = () => {
  const { activities, years } = useActivities();
  const [year, setYear] = useState('Total');
  const [runs, setRuns] = useState(activities);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);

  const [displayYear, setDisplayYear] = useState(year);
  const [displayRuns, setDisplayRuns] = useState(activities);
  const [phase, setPhase] = useState<'idle' | 'out' | 'in'>('idle');
  const prevYearRef = useRef<string>(year);
  const pendingRef = useRef<{ year: string; runs: typeof activities }>({
    year,
    runs: activities,
  });

  useEffect(() => {
    let filtered = filterAndSortRuns(
      activities,
      year,
      filterYearRuns,
      sortDateFunc
    );
    if (selectedCountry && selectedCountry.length > 0) {
      filtered = filtered.filter((r) =>
        filterCountryRuns(r, selectedCountry as string)
      );
      filtered.sort(sortDateFunc);
    }
    if (selectedProvince && selectedProvince.length > 0) {
      filtered = filtered.filter((r) =>
        filterProvinceRuns(r, selectedProvince as string)
      );
      filtered.sort(sortDateFunc);
    }
    if (selectedCity && selectedCity.length > 0) {
      filtered = filtered.filter((r) =>
        filterCityRuns(r, selectedCity as string)
      );
      filtered.sort(sortDateFunc);
    }
    setRuns(filtered);
  }, [year, activities, selectedCity, selectedCountry, selectedProvince]);

  useEffect(() => {
    pendingRef.current = { year, runs };
    if (prevYearRef.current !== year) {
      prevYearRef.current = year;
      setPhase('out');
    } else if (phase === 'idle' && displayYear === year) {
      setDisplayRuns(runs);
    }
  }, [displayYear, phase, runs, year]);

  const handleTransitionEnd: TransitionEventHandler<HTMLDivElement> = (e) => {
    if (e.target !== e.currentTarget) return;
    if (e.propertyName !== 'opacity' && e.propertyName !== 'transform') return;
    if (phase === 'out') {
      setDisplayYear(pendingRef.current.year);
      setDisplayRuns(pendingRef.current.runs);
      setPhase('in');
      return;
    }
    if (phase === 'in') {
      setPhase('idle');
    }
  };

  const handleSelectCity = (city: string) => {
    if (!city) {
      setSelectedCity(null);
      return;
    }
    setSelectedCity((prev) => (prev === city ? null : city));
  };

  const handleSelectCountry = (country: string) => {
    if (!country) {
      setSelectedCountry(null);
      return;
    }
    setSelectedCountry((prev) => (prev === country ? null : country));
  };

  const handleSelectProvince = (province: string) => {
    if (!province) {
      setSelectedProvince(null);
      return;
    }
    setSelectedProvince((prev) => (prev === province ? null : province));
  };

  const swapClassName = `transition-[opacity,transform] duration-200 ease-out will-change-[opacity,transform] ${
    phase === 'out' ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'
  }`;

  return (
    <Layout>
      <div className="p-4 lg:p-6 space-y-6">
        <div className="flex flex-wrap gap-2 justify-start">
          <button
            className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all duration-200 active:scale-95 ${
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
              className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all duration-200 active:scale-95 ${
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

        <div
          className={`grid grid-cols-1 lg:grid-cols-10 gap-6 ${swapClassName}`}
          onTransitionEnd={handleTransitionEnd}
        >
          <div className="lg:col-span-3">
            <TracksStats
              runs={displayRuns}
              year={displayYear}
              onSelectCity={handleSelectCity}
              selectedCity={selectedCity}
              topN={12}
              onSelectCountry={handleSelectCountry}
              selectedCountry={selectedCountry}
              onSelectProvince={handleSelectProvince}
              selectedProvince={selectedProvince}
            />
          </div>
          <div className="lg:col-span-7">
            <RunningCalendar year={displayYear} />
            <TracksGrid year={displayYear} />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Tracks;
