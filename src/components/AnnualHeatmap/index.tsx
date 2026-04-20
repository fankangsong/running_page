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

  const [hoveredLegendIndex, setHoveredLegendIndex] = useState<number | null>(null);
  const [hiddenLegendIndices, setHiddenLegendIndices] = useState<number[]>([]);

  const getLegendIndex = (value: number) => {
    if (value === 0) return -1;
    if (value < 5) return 0;
    if (value < 10) return 1;
    if (value < 15) return 2;
    if (value < 20) return 3;
    if (value < 25) return 4;
    return 5;
  };

  const legendItems = useMemo(() => [
    { label: '< 5', title: '0 - 4.99 km', colorClass: 'bg-blue-400' },
    { label: '5 ~ 10', title: '5 - 9.99 km', colorClass: 'bg-emerald-400' },
    { label: '10 ~ 15', title: '10 - 14.99 km', colorClass: 'bg-yellow-400' },
    { label: '15 ~ 20', title: '15 - 19.99 km', colorClass: 'bg-orange-400' },
    { label: '20 ~ 25', title: '20 - 24.99 km', colorClass: 'bg-accent' },
    { label: '≥ 25', title: '≥ 25 km', colorClass: 'bg-purple-500' },
  ], []);

  // Group data by date string for O(1) lookup
  const dataMap = useMemo(() => {
    const map = new Map<string, number>();
    data.forEach((d) => map.set(d.date, d.value));
    return map;
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

  const handleMouseEnter = (
    e: React.MouseEvent,
    date: string,
    value: number,
    isCurrentYear: boolean,
    isHidden: boolean
  ) => {
    if (!isCurrentYear || isLoading || value === 0 || isHidden) return;
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
      <style>{`
        @keyframes heatmapFadeIn {
          from { 
            opacity: 0; 
            transform: scale(0.5); 
          }
          to { 
            opacity: 1; 
            transform: scale(1); 
          }
        }
        .heatmap-cell-anim {
          opacity: 0;
          animation: heatmapFadeIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>
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
            <div key={`${year}-${weekIdx}`} className="flex flex-col gap-1">
              {week.map((day, dayIdx) => {
                const cellLegendIdx = getLegendIndex(day.value);
                const isHidden = hiddenLegendIndices.includes(cellLegendIdx);
                const isLegendHovered = hoveredLegendIndex !== null;
                const isCurrentLegendHovered = hoveredLegendIndex === cellLegendIdx;

                let cellClass = '';
                if (!day.isCurrentYear) {
                  cellClass = 'bg-transparent';
                } else if (isLoading) {
                  cellClass = 'bg-gray-800/70 animate-pulse';
                } else if (day.value === 0) {
                  cellClass = 'bg-card border border-gray-800';
                } else {
                  const baseColor = legendItems[cellLegendIdx].colorClass;
                  if (isCurrentLegendHovered) {
                    cellClass = `${baseColor} opacity-100 ring-1 ring-primary z-10`;
                  } else if (isHidden) {
                    cellClass = 'bg-card border border-gray-800';
                  } else if (isLegendHovered) {
                    cellClass = `${baseColor} opacity-20`;
                  } else {
                    cellClass = `${baseColor} heatmap-cell-anim`;
                  }
                }

                const interactionClass = day.isCurrentYear && !isLoading && day.value > 0 && !isHidden
                  ? 'cursor-pointer hover:ring-1 hover:ring-primary hover:z-10'
                  : '';

                return (
                  <div
                    key={`${year}-${weekIdx}-${dayIdx}-${isLoading ? 'loading' : 'loaded'}`}
                    className={`w-2.5 h-2.5 rounded-sm transition-all duration-200 relative ${cellClass} ${interactionClass}`}
                    style={
                      day.isCurrentYear && !isLoading
                        ? { animationDelay: `${weekIdx * 20 + dayIdx * 5}ms` }
                        : {}
                    }
                    onMouseEnter={(e) => {
                      if (isHidden && !isCurrentLegendHovered) return;
                      handleMouseEnter(
                        e,
                        day.date || '',
                        day.value,
                        day.isCurrentYear,
                        isHidden && !isCurrentLegendHovered
                      );
                    }}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => {
                      if (
                        !isLoading &&
                        day.isCurrentYear &&
                        day.date &&
                        onDayClick &&
                        (!isHidden || isCurrentLegendHovered)
                      ) {
                        onDayClick(day.date, day.value);
                      }
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
        </div>

        {/* Legend */}
        <div className="flex justify-end mt-6">
          <div className="flex gap-1">
            {isLoading ? (
              [...Array(6)].map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div className="w-8 h-2 rounded-sm bg-gray-800/70 animate-pulse"></div>
                  <span className="text-[10px] text-gray-800/50 animate-pulse font-medium">...</span>
                </div>
              ))
            ) : (
              <>
                {legendItems.map((item, i) => {
                  const isHidden = hiddenLegendIndices.includes(i);
                  const isHovered = hoveredLegendIndex === i;
                  const isOtherHovered = hoveredLegendIndex !== null && hoveredLegendIndex !== i;

                  return (
                    <div 
                      key={i} 
                      className={`flex flex-col items-center gap-1 cursor-pointer transition-opacity duration-200 ${isOtherHovered ? 'opacity-40' : 'opacity-100'}`}
                      onMouseEnter={() => setHoveredLegendIndex(i)}
                      onMouseLeave={() => setHoveredLegendIndex(null)}
                      onClick={() => {
                        setHiddenLegendIndices(prev => 
                          prev.includes(i) ? prev.filter(idx => idx !== i) : [...prev, i]
                        );
                      }}
                    >
                      <div 
                        className={`w-8 h-2 rounded-sm transition-all duration-200 ${isHidden && !isHovered ? 'bg-card border border-gray-800' : item.colorClass} ${isHovered ? 'ring-1 ring-primary' : ''}`} 
                        title={item.title}
                      ></div>
                      <span className={`text-[10px] font-sans tracking-wider transition-colors duration-200 ${isHidden ? 'text-gray-800/50' : 'text-secondary'}`}>
                        {item.label}
                      </span>
                    </div>
                  );
                })}
              </>
            )}
          </div>
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
