import React, { useEffect, useMemo, useState } from 'react';
import {
  convertMovingTime2Sec,
  Activity,
  RunIds,
} from '@/utils/utils';
import RunRow from './RunRow';
import styles from './style.module.scss';

interface IRunTableProperties {
  runs: Activity[];
  locateActivity: (_runIds: RunIds) => void;
  setActivity: (_runs: Activity[]) => void;
  runIndex: number;
  setRunIndex: (_index: number) => void;
}

type SortFunc = (_a: Activity, _b: Activity) => number;
type IRunTableHeaderKey = 'KM' | 'Pace' | 'BPM' | 'Time' | 'Date';

const RunTable = ({
  runs,
  locateActivity,
  setActivity,
  runIndex,
  setRunIndex,
}: IRunTableProperties) => {
  const [sortKey, setSortKey] = useState<IRunTableHeaderKey>('Date');
  const [sortAsc, setSortAsc] = useState(false);

  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(1);

  const totalCount = runs.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  useEffect(() => {
    setPage((p) => Math.min(Math.max(1, p), totalPages));
  }, [totalPages]);

  const sortFuncMap = useMemo(() => {
    const compareAscByKey: Record<IRunTableHeaderKey, SortFunc> = {
      KM: (a, b) => a.distance - b.distance,
      Pace: (a, b) => a.average_speed - b.average_speed,
      BPM: (a, b) => (a.average_heartrate ?? 0) - (b.average_heartrate ?? 0),
      Time: (a, b) =>
        convertMovingTime2Sec(a.moving_time) - convertMovingTime2Sec(b.moving_time),
      Date: (a, b) =>
        new Date(a.start_date_local.replace(' ', 'T')).getTime() -
        new Date(b.start_date_local.replace(' ', 'T')).getTime(),
    };
    const compareAsc = compareAscByKey[sortKey];
    const compare = sortAsc ? compareAsc : (a: Activity, b: Activity) => compareAsc(b, a);
    return new Map<IRunTableHeaderKey, SortFunc>([
      ['KM', compare],
      ['Pace', compare],
      ['BPM', compare],
      ['Time', compare],
      ['Date', compare],
    ]);
  }, [sortAsc, sortKey]);

  const handleSortClick =
    (key: IRunTableHeaderKey): React.MouseEventHandler<HTMLElement> =>
    () => {
      const nextAsc = sortKey === key ? !sortAsc : false;
      setSortKey(key);
      setSortAsc(nextAsc);

      const f = sortFuncMap.get(key);
      if (!f) return;
      setRunIndex(-1);
      setPage(1);
      setActivity([...runs].sort(f));
    };

  const pageStart = (page - 1) * pageSize;
  const pageEnd = Math.min(totalCount, pageStart + pageSize);
  const pageRuns = runs.slice(pageStart, pageEnd);

  return (
    <div className={styles.wrapper}>
      <div className={styles.metaBar}>
        <div className={styles.count}>
          {totalCount === 0 ? '0' : `${pageStart + 1}-${pageEnd}`} / {totalCount}
        </div>
        <div className={styles.pager}>
          <button
            className={styles.pageButton}
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            type="button"
          >
            Prev
          </button>
          <div className={styles.pageInfo}>
            {page} / {totalPages}
          </div>
          <button
            className={styles.pageButton}
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            type="button"
          >
            Next
          </button>
          <select
            className={styles.pageSize}
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
          >
            {[10, 20, 50, 100].map((s) => (
              <option key={s} value={s}>
                {s} / page
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.runTable} cellSpacing="0" cellPadding="0">
          <thead>
            <tr>
              <th />
              {(Array.from(sortFuncMap.keys()) as IRunTableHeaderKey[]).map((k) => (
                <th key={k} onClick={handleSortClick(k)}>
                  {k}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRuns.map((run, elementIndex) => (
              <RunRow
                key={run.run_id}
                elementIndex={pageStart + elementIndex}
                locateActivity={locateActivity}
                run={run}
                runIndex={runIndex}
                setRunIndex={setRunIndex}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RunTable;
