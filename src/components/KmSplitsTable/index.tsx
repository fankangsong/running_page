import { useMemo } from 'react';
import { Lap, ActivityStreams, formatPace, formatLapTime, computeKmSplitsFromStreams } from '@/utils/utils';

interface KmSplitsTableProps {
  laps?: Lap[];
  streams?: ActivityStreams;
  totalDistance: number;
}

const KmSplitsTable = ({ laps, streams, totalDistance }: KmSplitsTableProps) => {
  // 优先使用 laps 数据，若无则从 streams 计算
  const splits = useMemo(() => {
    if (laps && laps.length > 0) {
      return laps;
    }
    if (streams) {
      return computeKmSplitsFromStreams(streams, totalDistance);
    }
    return [];
  }, [laps, streams, totalDistance]);

  if (splits.length === 0) {
    return (
      <div className="text-center py-4">
        <span className="text-secondary text-sm">暂无每公里数据</span>
      </div>
    );
  }

  // 计算累计时间
  const cumulativeTime = useMemo(() => {
    const times: number[] = [];
    let sum = 0;
    splits.forEach((split) => {
      sum += split.elapsed_time || 0;
      times.push(sum);
    });
    return times;
  }, [splits]);

  // 找出最快公里
  const fastestIdx = useMemo(() => {
    let fastest = Infinity;
    let idx = -1;
    splits.forEach((split, i) => {
      if (split.average_speed && split.average_speed > 0) {
        const pace = (1000 / split.average_speed) / 60;
        if (pace < fastest) {
          fastest = pace;
          idx = i;
        }
      }
    });
    return idx;
  }, [splits]);

  return (
    <div className="overflow-hidden rounded-lg border border-gray-800/50">
      {/* 表头 */}
      <div className="grid grid-cols-5 bg-gray-900/50 px-3 py-2">
        <div className="text-[10px] font-bold text-secondary uppercase tracking-wider">KM</div>
        <div className="text-[10px] font-bold text-secondary uppercase tracking-wider">配速</div>
        <div className="text-[10px] font-bold text-secondary uppercase tracking-wider">累计</div>
        <div className="text-[10px] font-bold text-secondary uppercase tracking-wider">心率</div>
        <div className="text-[10px] font-bold text-secondary uppercase tracking-wider">海拔</div>
      </div>

      {/* 数据行 */}
      {splits.map((split, idx) => {
        const isFastest = idx === fastestIdx;
        const pace = split.average_speed ? formatPace(split.average_speed) : '--';
        const cumulative = formatLapTime(cumulativeTime[idx]);
        const hr = split.average_heartrate ? Math.round(split.average_heartrate) : '--';
        const elev = split.total_elevation_gain
          ? `${split.total_elevation_gain > 0 ? '+' : ''}${Math.round(split.total_elevation_gain)}m`
          : '--';

        return (
          <div
            key={idx}
            className={`grid grid-cols-5 px-3 py-2 transition-colors ${
              isFastest
                ? 'bg-accent/20 ring-1 ring-accent/50'
                : 'hover:bg-gray-800/30'
            }`}
          >
            <div className="font-condensed font-black text-primary">
              {split.lap_index}
              {isFastest && <span className="text-accent ml-1">*</span>}
            </div>
            <div className={`font-condensed font-black ${isFastest ? 'text-accent' : 'text-primary'}`}>
              {pace}
            </div>
            <div className="font-condensed font-medium text-secondary">
              {cumulative}
            </div>
            <div className="font-condensed font-medium text-secondary">
              {hr !== '--' ? `${hr} bpm` : '--'}
            </div>
            <div className="font-condensed font-medium text-secondary">
              {elev}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default KmSplitsTable;
