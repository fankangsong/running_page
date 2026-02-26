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

  return (
    <div className="bg-card rounded-card p-6 shadow-lg border border-gray-800/50">
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
            {years.map((y) => (
            <button
                key={y}
                className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all duration-200 ${
                year === y
                    ? 'bg-accent text-white shadow-md shadow-accent/20'
                    : 'bg-gray-800 text-secondary hover:bg-gray-700 hover:text-primary'
                }`}
                onClick={() => setYear(y)}
            >
                {y}
            </button>
            ))}
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className="w-full overflow-hidden">
            <RunningCalendar year={year} />
        </div>
        <div className="min-h-[400px]">
            <RunTable
            runs={runs}
            locateActivity={locateActivity}
            setActivity={setActivity}
            runIndex={runIndex}
            setRunIndex={setRunIndex}
            />
        </div>
      </div>
    </div>
  );
};

export default ActivityList;
