import { useMemo } from 'react';
import { Lap, ActivityStreams, formatPace, formatLapTime, computeKmSplitsFromStreams } from '@/utils/utils';

interface KmSplitsTableProps {
  laps?: Lap[];
  streams?: ActivityStreams;
  totalDistance: number;
}

const KmSplitsTable = ({ laps, streams, totalDistance }: KmSplitsTableProps) => {
  // 判断是否使用 laps 数据：
  // - 如果 laps 有多个条目（每公里一条），直接使用
  // - 如果 laps 只有 1 条但距离 > 1000m（整个活动作为一圈），则从 streams 计算
  const splits = useMemo(() => {
    if (laps && laps.length > 1) {
      // 多个 laps，说明设备配置为每公里记录一圈
      return laps;
    }
    if (laps && laps.length === 1 && laps[0].distance <= 1100) {
      // 单个 lap 且距离约 1km，可能是真实的每公里数据
      return laps;
    }
    // 其他情况（单个 lap 覆盖长距离）：从 streams 计算
    if (streams) {
      const computed = computeKmSplitsFromStreams(streams, totalDistance);
      if (computed.length > 0) {
        return computed;
      }
    }
    // 如果没有 streams 数据但有单个 lap，尝试根据 lap 平均配速估算
    if (laps && laps.length === 1 && laps[0].average_speed) {
      const kmCount = Math.ceil(totalDistance / 1000);
      const avgSpeed = laps[0].average_speed;
      const avgHr = laps[0].average_heartrate;
      const estimatedSplits: Lap[] = [];
      const timePerKm = 1000 / avgSpeed; // 秒/公里

      for (let km = 1; km <= kmCount; km++) {
        estimatedSplits.push({
          lap_index: km,
          distance: 1000,
          elapsed_time: Math.round(timePerKm),
          moving_time: Math.round(timePerKm),
          average_speed: avgSpeed,
          average_heartrate: avgHr,
        });
      }
      return estimatedSplits;
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
