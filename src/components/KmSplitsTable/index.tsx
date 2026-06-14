import { useMemo, useState } from 'react';
import { Lap, ActivityStreams, formatPace, formatLapTime, computeKmSplitsFromStreams } from '@/utils/utils';

interface HoverRange {
  startKm: number;
  endKm: number;
}

interface KmSplitsTableProps {
  laps?: Lap[];
  streams?: ActivityStreams;
  totalDistance: number;
  onSelectLap?: (_range: HoverRange | null) => void;
}

const KmSplitsTable = ({ laps, streams, totalDistance, onSelectLap }: KmSplitsTableProps) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  // 判断是否使用 laps 数据
  const splits = useMemo(() => {
    if (laps && laps.length > 1) {
      return laps;
    }
    if (laps && laps.length === 1 && laps[0].distance <= 1100) {
      return laps;
    }
    if (streams) {
      const computed = computeKmSplitsFromStreams(streams, totalDistance);
      if (computed.length > 0) {
        return computed;
      }
    }
    if (laps && laps.length === 1 && laps[0].average_speed) {
      const kmCount = Math.ceil(totalDistance / 1000);
      const avgSpeed = laps[0].average_speed;
      const avgHr = laps[0].average_heartrate;
      const estimatedSplits: Lap[] = [];
      const timePerKm = 1000 / avgSpeed;

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
    return null;
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
    <div className="overflow-hidden rounded-card border border-gray-800/50">
      {/* 表头 - 渐变色标题风格 */}
      <div className="grid grid-cols-5 bg-gradient-to-r from-gray-900/80 to-gray-800/50 px-4 py-3 border-b border-gray-800/30">
        <div className="text-[10px] font-bold text-secondary uppercase tracking-wider">KM</div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">配速</div>
        <div className="text-[10px] font-bold text-secondary uppercase tracking-wider">累计</div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-400">心率</div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">海拔</div>
      </div>

      {/* 数据行 */}
      {splits.map((split, idx) => {
        const isFastest = idx === fastestIdx;
        const isSelected = idx === selectedIndex;
        const pace = split.average_speed ? formatPace(split.average_speed) : '--';
        const cumulative = formatLapTime(cumulativeTime[idx]);
        const hr = split.average_heartrate ? Math.round(split.average_heartrate) : '--';
        const elev = split.total_elevation_gain
          ? `${split.total_elevation_gain > 0 ? '+' : ''}${Math.round(split.total_elevation_gain)}m`
          : '--';

        // 计算该分段的距离范围
        const startKm = split.lap_index - 1;
        const endKm = split.lap_index;

        // 点击选中/取消选中
        const handleClick = () => {
          if (isSelected) {
            setSelectedIndex(null);
            onSelectLap?.(null);
          } else {
            setSelectedIndex(idx);
            onSelectLap?.({ startKm, endKm });
          }
        };

        return (
          <div
            key={idx}
            onClick={handleClick}
            className={`grid grid-cols-5 px-4 py-2.5 transition-all duration-200 border-b border-gray-800/20 last:border-b-0 cursor-pointer ${
              isSelected
                ? 'bg-cyan-500/20 border-l-2 border-l-cyan-400'
                : isFastest
                  ? 'bg-gradient-to-r from-amber-500/10 to-orange-500/5 hover:from-amber-500/15 hover:to-orange-500/10'
                  : 'hover:bg-gray-800/30'
            }`}
          >
            {/* KM - 大号醒目数字 */}
            <div className="flex items-center gap-1.5">
              <span className={`font-condensed font-black text-lg leading-none ${
                isSelected ? 'text-cyan-400' : isFastest ? 'text-amber-400' : 'text-primary'
              }`}>
                {split.lap_index}
              </span>
              {isFastest && !isSelected && (
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">PB</span>
              )}
              {isSelected && (
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">✓</span>
              )}
            </div>

            {/* 配速 - 醒目数字 + 单位 */}
            <div className="flex items-baseline gap-1">
              <span className={`font-condensed font-black text-lg leading-none ${
                isSelected
                  ? 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400'
                  : isFastest
                    ? 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400'
                    : 'text-cyan-400'
              }`}>
                {pace}
              </span>
            </div>

            {/* 累计时间 */}
            <div className="flex items-baseline gap-1">
              <span className={`font-condensed font-medium text-base leading-none ${
                isSelected ? 'text-primary' : 'text-secondary'
              }`}>
                {cumulative}
              </span>
            </div>

            {/* 心率 - 醒目数字 + 单位 */}
            <div className="flex items-baseline gap-1">
              <span className={`font-condensed font-black text-lg leading-none ${
                isSelected ? 'text-orange-400' : hr !== '--' ? 'text-orange-400' : 'text-secondary'
              }`}>
                {hr}
              </span>
              {hr !== '--' && (
                <span className="text-[10px] font-medium text-secondary">bpm</span>
              )}
            </div>

            {/* 海拔 */}
            <div className="flex items-baseline gap-1">
              <span className={`font-condensed font-black text-lg leading-none ${
                isSelected
                  ? elev !== '--' && elev.startsWith('+') ? 'text-emerald-400' : 'text-red-400'
                  : elev !== '--'
                    ? elev.startsWith('+')
                      ? 'text-emerald-400'
                      : 'text-red-400'
                    : 'text-secondary'
              }`}>
                {elev !== '--' ? elev.replace('m', '') : '--'}
              </span>
              {elev !== '--' && (
                <span className="text-[10px] font-medium text-secondary">m</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default KmSplitsTable;