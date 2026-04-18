import React from 'react';
import { Activity, titleForRun } from '@/utils/utils';
import Dropdown from '@/components/Dropdown';
import { Link } from 'react-router-dom';
import ActivityIcon from '@/components/ActivityIcon';

interface RunListSidebarProps {
  runs: Activity[];
  year?: string;
  month?: number;
  years?: string[];
  onChangeYearMonth?: (year: string, month: number) => void;
  onSelectRun: (runId: number) => void;
  selectedRunId?: number | null;
  availableYearMonths?: Record<string, number[]>;
  availableYearMonthList?: { year: string; month: number }[];
  showFilter?: boolean;
  title?: string;
  icon?: React.ReactNode;
  emptyText?: string;
}

const RunListSidebar: React.FC<RunListSidebarProps> = ({
  runs,
  year = '',
  month = 1,
  years = [],
  onChangeYearMonth,
  onSelectRun,
  selectedRunId,
  availableYearMonths = {},
  availableYearMonthList = [],
  showFilter = true,
  title = 'RUNS',
  icon,
  emptyText = 'No runs this month.',
}) => {
  const currentIndex = availableYearMonthList.findIndex(
    (item) => item.year === year && item.month === month
  );

  const handlePrevMonth = () => {
    // Prev means moving forward in time (newer month) -> lower index
    if (currentIndex > 0 && onChangeYearMonth) {
      const next = availableYearMonthList[currentIndex - 1];
      onChangeYearMonth(next.year, next.month);
    }
  };

  const handleNextMonth = () => {
    // Next means moving backward in time (older month) -> higher index
    if (currentIndex < availableYearMonthList.length - 1 && onChangeYearMonth) {
      const prev = availableYearMonthList[currentIndex + 1];
      onChangeYearMonth(prev.year, prev.month);
    }
  };

  const handleYearChange = (newYear: string) => {
    if (availableYearMonths[newYear] && availableYearMonths[newYear].length > 0 && onChangeYearMonth) {
      onChangeYearMonth(newYear, availableYearMonths[newYear][0]);
    }
  };

  const handleMonthChange = (newMonth: number) => {
    if (onChangeYearMonth) {
      onChangeYearMonth(year, newMonth);
    }
  };

  const monthNames = [
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

  return (
    <div className="pointer-events-auto bg-card/90 backdrop-blur-xl rounded-card shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-gray-800/50 flex flex-col w-full md:w-80 md:max-h-[50vh] lg:max-h-[calc(100vh-120px)] transition-all overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
      
      {/* Header */}
      <div className="relative z-50 flex flex-col gap-3 p-4 border-b border-gray-800/50">
        <div className="flex justify-center items-center">
          <div className="flex items-center gap-2">
            {icon || (
              <svg
                viewBox="0 0 24 24"
                className="w-5 h-5 text-orange-400"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            )}
            <h2 className={`text-lg font-black italic uppercase tracking-wider text-transparent bg-clip-text ${!icon ? 'bg-gradient-to-r from-orange-400 to-red-500' : 'bg-gradient-to-r from-emerald-400 to-teal-200'}`}>
              {title}
            </h2>
          </div>
        </div>

        {showFilter && (
          <div className="flex justify-between items-center gap-2">
            <button
              onClick={handlePrevMonth}
              disabled={currentIndex <= 0}
              className={`p-1.5 rounded transition-all ${
                currentIndex <= 0 
                  ? 'text-gray-600 cursor-not-allowed opacity-50' 
                  : 'text-secondary hover:text-primary hover:bg-gray-800 cursor-pointer'
              }`}
              title="Newer Month"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <div className="flex items-center gap-2 flex-1">
              <Dropdown
                className="flex-1"
                options={Object.keys(availableYearMonths).sort((a,b)=>Number(b)-Number(a)).map((y) => ({ label: y, value: y }))}
                value={year}
                onChange={(val) => handleYearChange(val as string)}
              />
              <Dropdown
                className="flex-1"
                options={(availableYearMonths[year] || []).map((m) => ({ label: monthNames[m - 1], value: m }))}
                value={month}
                onChange={(val) => handleMonthChange(val as number)}
              />
            </div>

            <button
              onClick={handleNextMonth}
              disabled={currentIndex >= availableYearMonthList.length - 1}
              className={`p-1.5 rounded transition-all ${
                currentIndex >= availableYearMonthList.length - 1 
                  ? 'text-gray-600 cursor-not-allowed opacity-50' 
                  : 'text-secondary hover:text-primary hover:bg-gray-800 cursor-pointer'
              }`}
              title="Older Month"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* List */}
      <div className="relative z-10 flex-1 overflow-y-auto custom-scrollbar p-2 max-h-[160px] md:max-h-none">
        {runs.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-sm text-secondary">
            {emptyText}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {runs.map((run) => {
              const isSelected = selectedRunId === run.run_id;
              const distanceKm = (run.distance / 1000).toFixed(2);
              const date = new Date(run.start_date_local);
              const dateStr = showFilter 
                ? `${monthNames[date.getMonth()]} ${date.getDate()}`
                : `${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
              const title = run.name || titleForRun(run);

              return (
                <div
                  key={run.run_id}
                  onClick={() => onSelectRun(run.run_id)}
                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all border ${
                    isSelected
                      ? 'bg-gray-800/80 border-orange-500/50 shadow-md'
                      : 'bg-transparent border-transparent hover:bg-gray-800/40'
                  }`}
                >
                  <div className="flex flex-col min-w-0 flex-1 pr-4">
                    <div className="flex items-center gap-1.5 mb-1">
                      <ActivityIcon type={run.type} size={14} className="text-secondary" />
                      <span className="text-xs text-secondary font-medium">
                        {dateStr}
                      </span>
                    </div>
                    <span className={`text-sm font-bold truncate ${isSelected ? 'text-primary' : 'text-gray-200'}`}>
                      {title}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-baseline gap-1">
                      <span className={`text-xl font-condensed font-black tracking-tight ${isSelected ? 'text-accent' : 'text-primary'}`}>
                        {distanceKm}
                      </span>
                      <span className="text-[10px] text-secondary font-medium">KM</span>
                    </div>
                    <Link
                      to={`/run/${run.run_id}`}
                      onClick={(e) => e.stopPropagation()}
                      className={`flex items-center justify-center p-1.5 rounded-full transition-colors ${
                        isSelected
                          ? 'bg-white text-black hover:bg-gray-200'
                          : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700 hover:text-white'
                      }`}
                      title="View Details"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M5 12h14" />
                        <path d="m12 5 7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default RunListSidebar;
