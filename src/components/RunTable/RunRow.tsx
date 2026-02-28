import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { formatPace, titleForRun, formatRunTime, Activity, RunIds, dayOfWeek } from '@/utils/utils';
import styles from './style.module.scss';

interface IRunRowProperties {
  elementIndex: number;
  animationDelayMs: number;
  locateActivity: (_runIds: RunIds) => void;
  run: Activity;
  runIndex: number;
  setRunIndex: (_ndex: number) => void;
}

const RunRow = ({
  elementIndex,
  animationDelayMs,
  locateActivity,
  run,
  runIndex,
  setRunIndex,
}: IRunRowProperties) => {
  const distance = (run.distance / 1000.0).toFixed(2);
  const paceParts = run.average_speed ? formatPace(run.average_speed) : null;
  const heartRate = run.average_heartrate;
  const runTime = formatRunTime(run.moving_time);
  const handleClick = () => {
    if (runIndex === elementIndex) {
      setRunIndex(-1);
      locateActivity([]);
      return
    };
    setRunIndex(elementIndex);
    locateActivity([run.run_id]);
  };

  return (
    <tr
      className={`${styles.runRow} ${styles.rowEnter} ${runIndex === elementIndex ? styles.selected : ''}`}
      onClick={handleClick}
      style={{ ['--row-delay' as never]: `${animationDelayMs}ms` } as CSSProperties}
    >
      <td>
        {dayOfWeek(run.start_date_local)}
        {titleForRun(run)}
      </td>
      <td>{distance}</td>
      {paceParts && <td>{paceParts}</td>}
      <td>{heartRate && heartRate.toFixed(0) || '~'}</td>
      <td>{runTime}</td>
      <td className={styles.runDate}>{run.start_date_local}</td>
      <td onClick={(e) => e.stopPropagation()}>
        <Link
          to={`/run/${run.run_id}`}
          title="View Details" 
        >
          <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="text-secondary hover:text-primary transition-colors">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
        </Link>
      </td>
    </tr>
  );
};

export default RunRow;
