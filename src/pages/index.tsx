import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import YearSelector from '@/components/YearSelector';
import AnnualHeatmap, { HeatmapData } from '@/components/AnnualHeatmap';
import ActivityStats from '@/components/ActivityStats';
import DashboardStats from '@/components/DashboardStats';
import CyclingText from '@/components/CyclingText';
import FlowingLinesBackground from '@/components/DashboardStats/FlowingLinesBackground';
import useActivities from '@/hooks/useActivities';
import {
  filterAndSortRuns,
  filterYearRuns,
  sortDateFunc,
  dateKeyForRun,
  isRun,
  locationForRun,
} from '@/utils/utils';

const Index = () => {
  const navigate = useNavigate();
  const { activities } = useActivities();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [yearStats, setYearStats] = useState({
    count: 0,
    distance: 0,
    countries: [] as string[],
    cities: [] as string[],
  });

  // Filter only running activities
  const runningActivities = useMemo(() => {
    return activities.filter((a) => isRun(a.type));
  }, [activities]);

  // Generate years from running activities
  const years = useMemo(() => {
    const yrsSet = new Set<number>();
    runningActivities.forEach((a) => {
      const year = new Date(a.start_date_local).getFullYear();
      if (!isNaN(year)) yrsSet.add(year);
    });
    if (!yrsSet.has(currentYear)) yrsSet.add(currentYear);
    return Array.from(yrsSet).sort((a, b) => b - a);
  }, [runningActivities, currentYear]);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    // Use a tiny timeout to allow the loading overlay to render for a split second,
    // providing a smooth transition as per the spec, while avoiding long artificial delays.
    const timer = setTimeout(() => {
      const yearRuns = filterAndSortRuns(
        runningActivities,
        selectedYear.toString(),
        filterYearRuns,
        sortDateFunc
      );

      const dateMap = new Map<string, number>();
      let totalDistance = 0;
      const countries = new Set<string>();
      const cities = new Set<string>();

      yearRuns.forEach((run) => {
        const dateKey = dateKeyForRun(run);
        if (!dateKey) return;
        const dist = run.distance / 1000.0;
        totalDistance += dist;
        dateMap.set(dateKey, (dateMap.get(dateKey) || 0) + dist);

        const location = locationForRun(run);
        if (location.country) countries.add(location.country);
        if (location.city) cities.add(location.city);
      });

      const data: HeatmapData[] = Array.from(dateMap.entries()).map(
        ([date, value]) => ({
          date,
          value,
        })
      );

      if (isMounted) {
        setHeatmapData(data);
        setYearStats({
          count: yearRuns.length,
          distance: totalDistance,
          countries: Array.from(countries).sort(),
          cities: Array.from(cities).sort(),
        });
        setIsLoading(false);
      }
    }, 50);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [selectedYear, runningActivities]);

  const handleDayClick = (date: string, value: number) => {
    if (value === 0) return; // No activity on this day

    // Find the first activity on this date
    const clickedActivity = runningActivities.find((a) => {
      const activityDate = a.start_date_local.split(' ')[0]; // Extract YYYY-MM-DD
      return activityDate === date && isRun(a.type);
    });

    if (clickedActivity && clickedActivity.run_id) {
      // Navigate to the run detail page
      navigate(`/run/${clickedActivity.run_id}`);
    } else {
      console.log(`No activity found for date ${date}`);
    }
  };


  return (
    <Layout>
      {/* Flowing Lines Background - covers viewport */}
      <FlowingLinesBackground />

      <div className="flex flex-col gap-6 lg:p-6 w-full relative z-10">
        {/* Dashboard Stats */}
        <div className="w-full">
          <DashboardStats runs={runningActivities} />
        </div>

        {/* Heatmap Card */}
        <div className="relative w-full bg-card rounded-card shadow-lg border border-gray-800/50 p-6 md:p-8 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-orange-500/10 to-transparent pointer-events-none" />
          
          <div className="relative z-10">
            {/* Header area of the card */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <svg
                    viewBox="0 0 24 24"
                    className="w-6 h-6 text-orange-400"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  <h2 className="text-xl md:text-2xl font-black italic uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">
                    YEARLY HEATMAP
                  </h2>
                </div>
                
                <div className="flex items-start gap-6 flex-wrap">
                  <div className="flex flex-col gap-1">
                    <span className="font-sans text-[10px] md:text-xs font-bold text-secondary uppercase tracking-wider">
                      TOTAL RUNS
                    </span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <CyclingText
                        text={String(yearStats.count)}
                        className="text-3xl md:text-4xl font-condensed font-black text-accent tracking-tight leading-none"
                        hoverPlay={true}
                        interval={50}
                      />
                    </div>
                  </div>
                  <div className="w-px h-8 bg-gray-800/50 hidden md:block self-center"></div>
                  <div className="flex flex-col gap-1">
                    <span className="font-sans text-[10px] md:text-xs font-bold text-secondary uppercase tracking-wider">
                      TOTAL DISTANCE
                    </span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <CyclingText
                        text={yearStats.distance.toFixed(1)}
                        className="text-3xl md:text-4xl font-condensed font-black text-accent tracking-tight leading-none"
                        hoverPlay={true}
                        interval={50}
                      />
                      <span className="text-xs font-medium text-secondary">KM</span>
                    </div>
                  </div>
                  <div className="w-px h-8 bg-gray-800/50 hidden md:block self-center"></div>
                  <div className="flex flex-col gap-1">
                    <span className="font-sans text-[10px] md:text-xs font-bold text-secondary uppercase tracking-wider">
                      COUNTRIES
                    </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {yearStats.countries.map((c, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-full text-xs font-bold text-sky-400 bg-gray-800/50 border border-gray-700/50"
                        >
                          {c}
                        </span>
                      ))}
                      {yearStats.countries.length === 0 && (
                        <span className="text-secondary text-xs">--</span>
                      )}
                    </div>
                  </div>
                  <div className="w-px h-8 bg-gray-800/50 hidden md:block self-center"></div>
                  <div className="flex flex-col gap-1">
                    <span className="font-sans text-[10px] md:text-xs font-bold text-secondary uppercase tracking-wider">
                      CITIES
                    </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {yearStats.cities.map((c, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-full text-xs font-bold text-violet-400 bg-gray-800/50 border border-gray-700/50"
                        >
                          {c}
                        </span>
                      ))}
                      {yearStats.cities.length === 0 && (
                        <span className="text-secondary text-xs">--</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <YearSelector
                years={years}
                selectedYear={selectedYear}
                onSelect={setSelectedYear}
              />
            </div>

            <div className="relative min-h-[180px] md:min-h-[180px]">
            {/* Loading overlay - only show when no data exists yet */}
            {heatmapData.length === 0 && isLoading && (
              <div className="absolute inset-0 bg-card/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
                <div className="text-secondary font-medium animate-pulse">
                  Loading {selectedYear} data...
                </div>
              </div>
            )}

            <AnnualHeatmap
              year={selectedYear}
              data={heatmapData}
              onDayClick={handleDayClick}
              isLoading={false}
              animationKey={`${selectedYear}-${heatmapData.length > 0 ? 'ready' : 'waiting'}`}
            />
          </div>
          </div>
        </div>

        {/* Activity Stats Module */}
        <ActivityStats activities={runningActivities} />
      </div>
    </Layout>
  );
};

export default Index;
