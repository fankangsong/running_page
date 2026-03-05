import { useEffect, useMemo, useRef, useState } from 'react';
import RunTable from '@/components/RunTable';
import { Activity, RunIds } from '@/utils/utils';

interface IActivityListProps {
  runs: Activity[];
  locateActivity: (_runIds: RunIds) => void;
  setActivity: (_runs: Activity[]) => void;
  runIndex: number;
  setRunIndex: (_index: number) => void;
}

const ActivityList = ({
  runs,
  locateActivity,
  setActivity,
  runIndex,
  setRunIndex,
}: IActivityListProps) => {
  const [displayRuns, setDisplayRuns] = useState(runs);
  const [isSwitching, setIsSwitching] = useState(false);
  const prevSignatureRef = useRef<string | null>(null);

  const runsSignature = useMemo(() => {
    const firstId = runs[0]?.run_id ?? '';
    return `${runs.length}|${firstId}`;
  }, [runs]);

  useEffect(() => {
    if (prevSignatureRef.current === null) {
      prevSignatureRef.current = runsSignature;
      return;
    }

    if (prevSignatureRef.current === runsSignature) return;
    prevSignatureRef.current = runsSignature;

    setIsSwitching(true);
    const t1 = setTimeout(() => {
      setDisplayRuns(runs);
    }, 140);
    const t2 = setTimeout(() => {
      setIsSwitching(false);
    }, 160);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [runs, runsSignature]);

  const swapClassName = `transition-[opacity,transform] duration-200 ease-out will-change-[opacity,transform] ${
    isSwitching ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'
  }`;

  return (
    <div className="bg-card rounded-card p-6 shadow-lg border border-gray-800/50">
      <div className="flex flex-col gap-6">
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
