import { Activity, formatPace, locationForRun } from '@/utils/utils';

interface ITracksStatsProps {
  runs: Activity[];
  year: string;
  selectedType: string;
  onSelectCity?: (_city: string) => void;
  selectedCity?: string | null;
  topN?: number;
  selectedCountry?: string | null;
}

const TracksStats = ({
  runs,
  year,
  selectedType,
  onSelectCity,
  selectedCity = null,
  topN = 12,
  selectedCountry = null,
}: ITracksStatsProps) => {
  const typedRuns = runs.filter((run) => run.type === selectedType);
  let sumDistance = 0;
  let streak = 0;
  let totalMetersAvail = 0;
  let totalSecondsAvail = 0;
  const countries = new Set<string>();
  const cities: Record<string, number> = {};
  const countryDistances: Record<string, number> = {};
  const provinceDistances: Record<string, number> = {};

  typedRuns.forEach((run) => {
    sumDistance += run.distance || 0;
    if (run.average_speed) {
      totalMetersAvail += run.distance || 0;
      totalSecondsAvail += (run.distance || 0) / run.average_speed;
    }
    if (run.streak) {
      streak = Math.max(streak, run.streak);
    }
    const { country, city, province } = locationForRun(run);
    if (country) {
      countries.add(country);
      countryDistances[country] =
        (countryDistances[country] || 0) + (run.distance || 0);
    }
    if (city && city.length > 0) {
      cities[city] = (cities[city] || 0) + (run.distance || 0);
    }
    if (province && province.length > 0) {
      provinceDistances[province] =
        (provinceDistances[province] || 0) + (run.distance || 0);
    }
  });

  const distance = (sumDistance / 1000.0).toFixed(1);
  const avgPace =
    totalSecondsAvail > 0
      ? formatPace(totalMetersAvail / totalSecondsAvail)
      : '0\'00"';
  const countryCount = countries.size;
  const cityCount = Object.keys(cities).length;
  const topCities = Object.entries(cities)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN);
  const topCountries = Object.entries(countryDistances)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN);

  return (
    <div className="relative w-full bg-card rounded-card shadow-lg border border-gray-800/50 p-6 md:p-8 overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-sky-500/10 to-transparent pointer-events-none" />
      <div className="relative z-10 flex flex-col gap-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <svg
            viewBox="0 0 24 24"
            className="w-6 h-6 text-sky-400"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <h2 className="text-xl md:text-2xl font-black italic uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500">
            TRACKS SUMMARY
          </h2>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-1 gap-y-4 gap-x-6 md:gap-y-5 pb-6 border-b border-gray-800/50">
          <div className="flex flex-col items-start text-left gap-0.5">
            <span className="font-sans text-[10px] md:text-xs font-bold text-secondary uppercase tracking-wider truncate">
              Journey
            </span>
            <div className="text-3xl md:text-4xl font-condensed font-black text-white tracking-tight leading-none mt-1">
              {year === 'Total' ? 'Total' : year}
            </div>
          </div>
          <div className="flex flex-col items-start text-left gap-0.5">
            <span className="font-sans text-[10px] md:text-xs font-bold text-secondary uppercase tracking-wider truncate">
              Runs
            </span>
            <div className="text-3xl md:text-4xl font-condensed font-black text-sky-400 tracking-tight leading-none mt-1">
              {typedRuns.length}
            </div>
          </div>
          <div className="flex flex-col items-start text-left gap-0.5">
            <span className="font-sans text-[10px] md:text-xs font-bold text-secondary uppercase tracking-wider truncate">
              Distance
            </span>
            <div className="flex items-baseline justify-start gap-1 mt-1 whitespace-nowrap">
              <span className="text-3xl md:text-4xl font-condensed font-black text-emerald-400 tracking-tight leading-none">
                {distance}
              </span>
              <span className="text-xs font-medium text-secondary">KM</span>
            </div>
          </div>
          <div className="flex flex-col items-start text-left gap-0.5">
            <span className="font-sans text-[10px] md:text-xs font-bold text-secondary uppercase tracking-wider truncate">
              Avg Pace
            </span>
            <div className="flex items-baseline justify-start gap-1 mt-1 whitespace-nowrap">
              <span className="text-3xl md:text-4xl font-condensed font-black text-amber-400 tracking-tight leading-none">
                {avgPace}
              </span>
              <span className="text-xs font-medium text-secondary">/KM</span>
            </div>
          </div>
          <div className="flex flex-col items-start text-left gap-0.5">
            <span className="font-sans text-[10px] md:text-xs font-bold text-secondary uppercase tracking-wider truncate">
              Countries
            </span>
            <div className="text-3xl md:text-4xl font-condensed font-black text-purple-400 tracking-tight leading-none mt-1">
              {countryCount}
            </div>
          </div>
          <div className="flex flex-col items-start text-left gap-0.5">
            <span className="font-sans text-[10px] md:text-xs font-bold text-secondary uppercase tracking-wider truncate">
              Cities
            </span>
            <div className="text-3xl md:text-4xl font-condensed font-black text-pink-400 tracking-tight leading-none mt-1">
              {cityCount}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="font-sans text-[10px] md:text-xs font-bold text-secondary uppercase tracking-wider">
            Countries{' '}
            {selectedCountry ? (
              <span className="ml-2 text-[10px] text-gray-400 normal-case">
                (filter: {selectedCountry})
              </span>
            ) : null}
          </span>
          <div className="grid grid-cols-1 gap-1">
            {topCountries.map(([country, meters]) => {
              const isActive = selectedCountry === country;
              return (
                <button
                  key={country}
                  className={`flex items-center justify-between text-sm cursor-default text-left px-3 py-2 rounded-lg transition-colors ${
                    isActive ? 'bg-gray-800 text-white' : 'hover:bg-gray-800/60'
                  }`}
                  type="button"
                >
                  <span className="text-white font-medium">{country}</span>
                  <span className="text-secondary font-mono">
                    {(meters / 1000).toFixed(0)} km
                  </span>
                </button>
              );
            })}
            {topCountries.length === 0 && (
              <div className="text-xs text-secondary italic">No country data</div>
            )}
            {selectedCountry && (
              <button
                className="text-xs text-sky-400 underline text-left mt-1 cursor-pointer hover:text-sky-300"
                onClick={() => onSelectCountry?.(null)}
                type="button"
              >
                Clear country filter
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="font-sans text-[10px] md:text-xs font-bold text-secondary uppercase tracking-wider">
            Cities{' '}
            {selectedCity ? (
              <span className="ml-2 text-[10px] text-gray-400 normal-case">
                (filter: {selectedCity})
              </span>
            ) : null}
          </span>
          <div className="grid grid-cols-1 gap-1">
            {topCities.map(([city, meters]) => {
              const isActive = selectedCity === city;
              return (
                <button
                  key={city}
                  className={`flex items-center justify-between text-sm cursor-default text-left px-3 py-2 rounded-lg transition-colors ${
                    isActive ? 'bg-gray-800 text-white' : 'hover:bg-gray-800/60'
                  }`}
                  type="button"
                >
                  <span className="text-white font-medium">{city}</span>
                  <span className="text-secondary font-mono">
                    {(meters / 1000).toFixed(0)} km
                  </span>
                </button>
              );
            })}
            {topCities.length === 0 && (
              <div className="text-xs text-secondary italic">No city data</div>
            )}
            {selectedCity && (
              <button
                className="text-xs text-sky-400 underline text-left mt-1 cursor-pointer hover:text-sky-300"
                onClick={() => onSelectCity?.('')}
                type="button"
              >
                Clear city filter
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TracksStats;
