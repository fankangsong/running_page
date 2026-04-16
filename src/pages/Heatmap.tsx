import { useState, useEffect, useMemo } from 'react';
import Layout from '@/components/Layout';
import YearSelector from '@/components/YearSelector';
import AnnualHeatmap, { HeatmapData } from '@/components/AnnualHeatmap';
import ActivityStats from '@/components/ActivityStats';
import DashboardStats from '@/components/DashboardStats';
import useActivities from '@/hooks/useActivities';
import { filterAndSortRuns, filterYearRuns, sortDateFunc, dateKeyForRun } from '@/utils/utils';

const Heatmap = () => {
  const { activities, years: activityYears } = useActivities();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [yearStats, setYearStats] = useState({ count: 0, distance: 0 });

  // Generate years from activities
  const years = useMemo(() => {
    const yrs = activityYears.map(Number);
    if (!yrs.includes(currentYear)) yrs.unshift(currentYear);
    return yrs.sort((a, b) => b - a);
  }, [activityYears, currentYear]);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    
    // Use a tiny timeout to allow the loading overlay to render for a split second,
    // providing a smooth transition as per the spec, while avoiding long artificial delays.
    const timer = setTimeout(() => {
      const yearRuns = filterAndSortRuns(
        activities,
        selectedYear.toString(),
        filterYearRuns,
        sortDateFunc
      );
      
      const dateMap = new Map<string, number>();
      let totalDistance = 0;
      
      yearRuns.forEach(run => {
        const dateKey = dateKeyForRun(run);
        if (!dateKey) return;
        const dist = run.distance / 1000.0;
        totalDistance += dist;
        dateMap.set(dateKey, (dateMap.get(dateKey) || 0) + dist);
      });
      
      const data: HeatmapData[] = Array.from(dateMap.entries()).map(([date, value]) => ({
        date,
        value,
      }));
      
      if (isMounted) {
        setHeatmapData(data);
        setYearStats({
          count: yearRuns.length,
          distance: totalDistance
        });
        setIsLoading(false);
      }
    }, 50);
    
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [selectedYear, activities]);

  const handleDayClick = (date: string, value: number) => {
    console.log(`Clicked on ${date} with value ${value}`);
    // Future: navigate to daily detail or open a modal
  };

  const handleClickPB = (run: any) => {
    const date = run.start_date_local;
    const y = date.slice(0, 4);
    setSelectedYear(parseInt(y));
    // Since heatmap currently only focuses on year, navigating to the specific year is enough.
    // If we want to highlight the specific date, we could add a new prop to AnnualHeatmap.
  };

  return (
    <Layout>
      <div className="flex flex-col gap-6 lg:p-6 w-full">
        
        {/* Dashboard Stats */}
        <div className="w-full">
          <DashboardStats />
        </div>

        {/* Heatmap Card */}
        <div className="w-full bg-card rounded-card shadow-lg border border-gray-800/50 p-4 lg:p-6 overflow-hidden relative">
          {/* Header area of the card */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex flex-col">
              <h2 className="text-xl font-bold text-secondary">
                {yearStats.count} runs, {yearStats.distance.toFixed(1)} KM
              </h2>
            </div>
            <YearSelector 
              years={years} 
              selectedYear={selectedYear} 
              onSelect={setSelectedYear} 
            />
          </div>

          {/* We show loading overlay to avoid screen flash/layout shift */}
          {isLoading && heatmapData.length > 0 && (
            <div className="absolute inset-0 bg-card/80 backdrop-blur-sm z-10 flex items-center justify-center transition-opacity duration-300">
              <div className="text-secondary font-medium animate-pulse">Loading {selectedYear} data...</div>
            </div>
          )}
          
          <AnnualHeatmap 
            year={selectedYear} 
            data={heatmapData} 
            onDayClick={handleDayClick}
            isLoading={isLoading && heatmapData.length === 0}
          />
        </div>

        {/* Activity Stats Module */}
        <ActivityStats activities={activities} />
      </div>
    </Layout>
  );
};

export default Heatmap;
