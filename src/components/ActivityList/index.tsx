import { useEffect, useMemo, useRef, useState } from 'react';
import useActivities from '@/hooks/useActivities';
import RunTable from '@/components/RunTable';
import RunningCalendar from '@/components/RunningCalendar';
import { Activity, RunIds } from '@/utils/utils';

interface IActivityListProps {
  year: string;
  setYear: (_year: string) => void;
  runs: Activity[];
  locateActivity: (_runIds: RunIds) => void;
  setActivity: (_runs: Activity[]) => void;
  runIndex: number;
  setRunIndex: (_index: number) => void;
}

const ActivityList = ({
  year,
  setYear,
  runs,
  locateActivity,
  setActivity,
  runIndex,
  setRunIndex,
}: IActivityListProps) => {
  const { years } = useActivities();
  const [displayYear, setDisplayYear] = useState(year);
  const [displayRuns, setDisplayRuns] = useState(runs);
  const [isSwitching, setIsSwitching] = useState(false);
  const prevSignatureRef = useRef<string | null>(null);

  const runsSignature = useMemo(() => {
    const firstId = runs[0]?.run_id ?? '';
    return `${year}|${runs.length}|${firstId}`;
  }, [runs, year]);

  useEffect(() => {
    if (prevSignatureRef.current === null) {
      prevSignatureRef.current = runsSignature;
      return;
    }

    if (prevSignatureRef.current === runsSignature) return;
    prevSignatureRef.current = runsSignature;

    setIsSwitching(true);
    const t1 = setTimeout(() => {
      setDisplayYear(year);
      setDisplayRuns(runs);
    }, 140);
    const t2 = setTimeout(() => {
      setIsSwitching(false);
    }, 160);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [runs, runsSignature, year]);

  const swapClassName = `transition-[opacity,transform] duration-200 ease-out will-change-[opacity,transform] ${
    isSwitching ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'
  }`;

  return (
    <div className="bg-card rounded-card p-6 shadow-lg border border-gray-800/50">
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
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
      </div>

      <div className="flex flex-col gap-6">
        <div className={`w-full overflow-hidden ${swapClassName}`}>
          <RunningCalendar year={displayYear} />
        </div>
        <div className={`min-h-[400px] overflow-hidden ${swapClassName}`}>
          <RunTable
            runs={displayRuns}
            locateActivity={locateActivity}
            setActivity={setActivity}
            runIndex={runIndex}
            setRunIndex={setRunIndex}
            compact
          />
        </div>
      </div>
    </div>
  );
};

export default ActivityList;
