import React, { useMemo, useState } from 'react';

export interface HeatmapData {
  date: string; // YYYY-MM-DD
  value: number;
}

interface AnnualHeatmapProps {
  year: number;
  data: HeatmapData[];
  onDayClick?: (date: string, value: number) => void;
  isLoading?: boolean;
}

const AnnualHeatmap: React.FC<AnnualHeatmapProps> = ({
  year,
  data,
  onDayClick,
  isLoading,
}) => {
  const [hoveredDay, setHoveredDay] = useState<{
    date: string;
    value: number;
    x: number;
    y: number;
  } | null>(null);

  // Group data by date string for O(1) lookup
  const dataMap = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach((d) => map.set(d.date, d.value));
    return map;
  }, [data]);

  // Find max value to determine intensity levels
  const maxValue = useMemo(() => {
    let max = 0;
    data.forEach((d) => {
      if (d.value > max) max = d.value;
    });
    return max;
  }, [data]);

  const weeks = useMemo(() => {
    const firstDayOfYear = new Date(year, 0, 1);
    const lastDayOfYear = new Date(year, 11, 31);

    // Day of week: 0 (Sun) to 6 (Sat)
    const startDayOfWeek = firstDayOfYear.getDay();

    // Start generating from the first Sunday before or on Jan 1st
    const currentDate = new Date(firstDayOfYear);
    currentDate.setDate(currentDate.getDate() - startDayOfWeek);

    const weeksArray: {
      date: string | null;
      value: number;
      isCurrentYear: boolean;
    }[][] = [];

    while (currentDate <= lastDayOfYear || currentDate.getDay() !== 0) {
      if (currentDate.getDay() === 0) {
        weeksArray.push([]);
      }

      const dateString = `${currentDate.getFullYear()}-${String(
        currentDate.getMonth() + 1
      ).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
      const isCurrentYear = currentDate.getFullYear() === year;

      weeksArray[weeksArray.length - 1].push({
        date: dateString,
        value: dataMap.get(dateString) || 0,
        isCurrentYear,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return weeksArray;
  }, [year, dataMap]);

  const getIntensityClass = (value: number) => {
    if (value === 0) return 'bg-card border border-gray-800';
    if (maxValue === 0) return 'bg-accent/20';

    const ratio = value / maxValue;
    if (ratio < 0.25) return 'bg-accent/20';
    if (ratio < 0.5) return 'bg-accent/40';
    if (ratio < 0.75) return 'bg-accent/60';
    if (ratio < 0.9) return 'bg-accent/80';
    return 'bg-accent';
  };

  const handleMouseEnter = (
    e: React.MouseEvent,
    date: string,
    value: number,
    isCurrentYear: boolean
  ) => {
    if (!isCurrentYear || isLoading) return;
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setHoveredDay({
      date,
      value,
      x: rect.left + rect.width / 2,
      y: rect.top - 8, // slightly above the cell
    });
  };

  const handleMouseLeave = () => {
    setHoveredDay(null);
  };

  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  // Calculate month labels positions based on the first occurrence of a month in the first day of the week
  const monthLabels = useMemo(() => {
    const labels: { month: string; colIndex: number }[] = [];
    let currentMonth = -1;

    weeks.forEach((week, index) => {
      const firstDayOfWeek = week.find((d) => d.isCurrentYear);
      if (firstDayOfWeek && firstDayOfWeek.date) {
        const month = parseInt(firstDayOfWeek.date.split('-')[1], 10) - 1;
        if (month !== currentMonth) {
          labels.push({ month: months[month], colIndex: index });
          currentMonth = month;
        }
      }
    });

    return labels;
  }, [weeks]);

  return (
    <div className="relative w-full overflow-x-auto overflow-y-hidden custom-scrollbar">
      <div className="min-w-max inline-block">
        <div className="flex mb-2 h-6 relative">
          <div className="w-8"></div> {/* Spacer for day labels */}
          <div className="flex-1 relative">
            {monthLabels.map((label, i) => (
              <span
                key={i}
                className="absolute text-xs text-secondary font-medium"
                style={{ left: `${label.colIndex * 14}px` }}
              >
                {label.month}
              </span>
            ))}
          </div>
        </div>

        <div className="flex gap-1">
          {/* Day of week labels */}
          <div className="flex flex-col gap-1 w-8 justify-between text-[10px] text-secondary font-medium py-1">
            <span>Sun</span>
            <span></span>
            <span>Tue</span>
            <span></span>
            <span>Thu</span>
            <span></span>
            <span>Sat</span>
          </div>

          {/* Grid */}
          <div className="flex gap-1">
            {weeks.map((week, weekIdx) => (
              <div key={weekIdx} className="flex flex-col gap-1">
                {week.map((day, dayIdx) => (
                  <div
                    key={`${weekIdx}-${dayIdx}`}
                    className={`w-2.5 h-2.5 rounded-sm transition-colors duration-200 ${
                      day.isCurrentYear
                        ? isLoading
                          ? 'bg-gray-800/70 animate-pulse'
                          : getIntensityClass(day.value)
                        : 'bg-transparent'
                    } ${
                      day.isCurrentYear && !isLoading
                        ? 'cursor-pointer hover:ring-1 hover:ring-primary'
                        : ''
                    }`}
                    onMouseEnter={(e) =>
                      handleMouseEnter(
                        e,
                        day.date || '',
                        day.value,
                        day.isCurrentYear
                      )
                    }
                    onMouseLeave={handleMouseLeave}
                    onClick={() => {
                      if (
                        !isLoading &&
                        day.isCurrentYear &&
                        day.date &&
                        onDayClick
                      ) {
                        onDayClick(day.date, day.value);
                      }
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-end gap-2 mt-4 text-xs text-secondary">
          <span>Less</span>
          <div className="flex gap-1">
            {isLoading ? (
              <>
                <div className="w-2.5 h-2.5 rounded-sm bg-gray-800/70 animate-pulse"></div>
                <div className="w-2.5 h-2.5 rounded-sm bg-gray-800/70 animate-pulse"></div>
                <div className="w-2.5 h-2.5 rounded-sm bg-gray-800/70 animate-pulse"></div>
                <div className="w-2.5 h-2.5 rounded-sm bg-gray-800/70 animate-pulse"></div>
                <div className="w-2.5 h-2.5 rounded-sm bg-gray-800/70 animate-pulse"></div>
                <div className="w-2.5 h-2.5 rounded-sm bg-gray-800/70 animate-pulse"></div>
              </>
            ) : (
              <>
                <div className="w-2.5 h-2.5 rounded-sm bg-card border border-gray-800"></div>
                <div className="w-2.5 h-2.5 rounded-sm bg-accent/20"></div>
                <div className="w-2.5 h-2.5 rounded-sm bg-accent/40"></div>
                <div className="w-2.5 h-2.5 rounded-sm bg-accent/60"></div>
                <div className="w-2.5 h-2.5 rounded-sm bg-accent/80"></div>
                <div className="w-2.5 h-2.5 rounded-sm bg-accent"></div>
              </>
            )}
          </div>
          <span>More</span>
        </div>
      </div>

      {/* Tooltip */}
      {hoveredDay && !isLoading && (
        <div
          className="fixed z-50 px-3 py-2 text-xs text-primary bg-card border border-gray-800 rounded-md shadow-lg pointer-events-none transform -translate-x-1/2 -translate-y-full whitespace-nowrap"
          style={{
            left: hoveredDay.x,
            top: hoveredDay.y,
          }}
        >
          <div className="font-bold mb-1">{hoveredDay.date}</div>
          <div>
            {hoveredDay.value > 0
              ? `${hoveredDay.value.toFixed(1)} km`
              : 'No activity'}
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnualHeatmap;
