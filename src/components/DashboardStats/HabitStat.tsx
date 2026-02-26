import React from 'react';
import useActivities from '@/hooks/useActivities';

const HabitStat = ({ changeTitle }: { changeTitle: (_title: string) => void }) => {
  const { runPeriod } = useActivities();
  const periodArr = Object.entries(runPeriod);
  periodArr.sort((a, b) => b[1] - a[1]);

  return (
    <div className="flex flex-col h-full justify-start gap-4">
      <div className="text-xs font-bold text-gray-500 tracking-widest uppercase mb-1">Habits</div>
      <div className="overflow-hidden flex-1 grid grid-cols-[min-content_auto] gap-x-2 gap-y-3">
        {periodArr.slice(0, 6).map(([period, times]) => (
          <React.Fragment key={period}>
            <div 
              className="text-right text-2xl font-black text-white whitespace-nowrap cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => changeTitle(period)}
            >
              {times}
            </div>
            <div 
              className="text-left text-xs font-bold text-gray-500 uppercase self-end pb-1 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => changeTitle(period)}
            >
              {period}
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default HabitStat;
