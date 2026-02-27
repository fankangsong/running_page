import { Activity, formatPace, locationForRun } from '@/utils/utils';

interface ITracksStatsProps {
  runs: Activity[];
  year: string;
  onSelectCity?: (_city: string) => void;
  selectedCity?: string | null;
  topN?: number;
}

const TracksStats = ({ runs, year, onSelectCity, selectedCity = null, topN = 12 }: ITracksStatsProps) => {
  let sumDistance = 0;
  let streak = 0;
  let totalMetersAvail = 0;
  let totalSecondsAvail = 0;
  const countries = new Set<string>();
  const cities: Record<string, number> = {};

  runs.forEach((run) => {
    sumDistance += run.distance || 0;
    if (run.average_speed) {
      totalMetersAvail += run.distance || 0;
      totalSecondsAvail += (run.distance || 0) / run.average_speed;
    }
    if (run.streak) {
      streak = Math.max(streak, run.streak);
    }
    const { country, city } = locationForRun(run);
    if (country) countries.add(country);
    if (city && city.length > 0) {
      cities[city] = (cities[city] || 0) + (run.distance || 0);
    }
  });

  const distance = (sumDistance / 1000.0).toFixed(1);
  const avgPace = totalSecondsAvail > 0 ? formatPace(totalMetersAvail / totalSecondsAvail) : "0'00\"";
  const countryCount = countries.size;
  const cityCount = Object.keys(cities).length;
  const topCities = Object.entries(cities).sort((a, b) => b[1] - a[1]).slice(0, topN);
  
  return (
    <div className="flex flex-col gap-4 text-white">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-secondary font-bold uppercase tracking-[0.5px]">Journey</span>
          <div className="text-[32px] font-bold leading-[1.2] bg-gradient-to-r from-[#4fc3f7] to-[#81d4fa] bg-clip-text text-transparent">
            {year === 'Total' ? 'Total' : year}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-secondary font-bold uppercase tracking-[0.5px]">Runs</span>
          <div className="text-[32px] font-bold leading-[1.2] bg-gradient-to-r from-[#4fc3f7] to-[#81d4fa] bg-clip-text text-transparent">
            {runs.length}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-secondary font-bold uppercase tracking-[0.5px]">KM</span>
          <div className="text-[32px] font-bold leading-[1.2] bg-gradient-to-r from-[#4fc3f7] to-[#81d4fa] bg-clip-text text-transparent">
            {distance}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-secondary font-bold uppercase tracking-[0.5px]">Avg Pace</span>
          <div className="text-[32px] font-bold leading-[1.2] bg-gradient-to-r from-[#4fc3f7] to-[#81d4fa] bg-clip-text text-transparent">
            {avgPace}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-secondary font-bold uppercase tracking-[0.5px]">Countries</span>
          <div className="text-[32px] font-bold leading-[1.2] bg-gradient-to-r from-[#4fc3f7] to-[#81d4fa] bg-clip-text text-transparent">
            {countryCount}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-secondary font-bold uppercase tracking-[0.5px]">Cities</span>
          <div className="text-[32px] font-bold leading-[1.2] bg-gradient-to-r from-[#4fc3f7] to-[#81d4fa] bg-clip-text text-transparent">
            {cityCount}
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-xs text-secondary font-bold uppercase tracking-[0.5px]">
          Top Cities {selectedCity ? <span className="ml-2 text-[10px] text-gray-400">(filter: {selectedCity})</span> : null}
        </span>
        <div className="grid grid-cols-1 gap-1">
          {topCities.map(([city, meters]) => {
            const isActive = selectedCity === city;
            return (
              <button
                key={city}
                className={`flex items-center justify-between text-sm text-left px-2 py-1 rounded ${
                  isActive ? 'bg-gray-800 text-white' : 'hover:bg-gray-800/60'
                }`}
                onClick={() => onSelectCity && onSelectCity(city)}
                type="button"
              >
                <span className="text-white">{city}</span>
                <span className="text-secondary">{(meters / 1000).toFixed(0)} km</span>
              </button>
            );
          })}
          {topCities.length === 0 && (
            <div className="text-xs text-secondary">No city data</div>
          )}
          {selectedCity && (
            <button
              className="text-xs text-gray-400 underline text-left mt-1 hover:text-gray-300"
              onClick={() => onSelectCity && onSelectCity('')}
              type="button"
            >
              Clear city filter
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TracksStats;
