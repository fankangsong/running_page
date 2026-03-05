import useActivities from '@/hooks/useActivities';

const AreaStat = ({ changeCity }: { changeCity: (_city: string) => void }) => {
  const {
    activities: runs,
    years,
    countries,
    provinces,
    cities,
  } = useActivities();

  // Calculate Max/Min Distance
  let maxDistance = 0;
  let minDistance = runs.length > 0 ? Infinity : 0;

  runs.forEach((run) => {
    const dist = run.distance / 1000;
    if (dist > maxDistance) maxDistance = dist;
    if (dist < minDistance) minDistance = dist;
  });

  const maxDistStr = maxDistance.toFixed(0);
  const minDistStr = minDistance === Infinity ? '0' : minDistance.toFixed(0);

  return (
    <div className="flex flex-col h-full justify-start gap-8">
      {/* MAX/MIN Section */}
      <div className="flex flex-col gap-4">
        <div className="text-xs font-bold text-gray-500 tracking-widest uppercase mb-1">
          Max/Min
        </div>
        <div className="flex flex-col gap-4">
          {/* Max Distance */}
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-white">
                {maxDistStr}KM
              </span>
              <span className="text-xs font-bold text-gray-500 uppercase">
                Max.
              </span>
            </div>
          </div>
          {/* Min Distance */}
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-white">
                {minDistStr}KM
              </span>
              <span className="text-xs font-bold text-gray-500 uppercase">
                Min.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* LOCATIONS Section */}
      <div className="flex flex-col gap-4">
        {/* Years */}
        {years && (
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-white">
                {years.length}
              </span>
              <span className="text-xs font-bold text-gray-500 uppercase">
                Years
              </span>
            </div>
          </div>
        )}
        {/* Countries */}
        {countries && (
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-white">
                {countries.length}
              </span>
              <span className="text-xs font-bold text-gray-500 uppercase">
                Countries
              </span>
            </div>
          </div>
        )}
        {/* Provinces */}
        {provinces && (
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-white">
                {provinces.length}
              </span>
              <span className="text-xs font-bold text-gray-500 uppercase">
                Provinces
              </span>
            </div>
          </div>
        )}
        {/* Cities */}
        {cities && (
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-white">
                {Object.keys(cities).length}
              </span>
              <span className="text-xs font-bold text-gray-500 uppercase">
                Cities
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="w-full h-px bg-gray-700 my-2"></div>

      <div className="flex flex-wrap gap-2 overflow-hidden">
        {Object.entries(cities)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 1)
          .map(([city, distance]) => (
            <div
              key={city}
              className="cursor-pointer group flex items-center px-2 py-1 bg-gray-700/50 hover:bg-gray-700 transition-colors rounded whitespace-nowrap"
              onClick={() => changeCity(city)}
            >
              <span className="font-bold text-gray-200 group-hover:text-white transition-colors text-xs mr-2">
                {city}
              </span>
              <span className="text-gray-500 text-[10px] font-mono group-hover:text-gray-400">
                {(distance / 1000).toFixed(0)}km
              </span>
            </div>
          ))}
      </div>
    </div>
  );
};

export default AreaStat;
