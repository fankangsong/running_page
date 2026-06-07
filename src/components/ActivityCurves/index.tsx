import { useMemo, useState } from 'react';
import { ActivityStreams } from '@/utils/utils';

type CurveType = 'heartrate' | 'pace' | 'altitude';

interface ActivityCurvesProps {
  streams?: ActivityStreams;
  totalDistance: number;
  className?: string;
}

const ActivityCurves = ({ streams, totalDistance, className }: ActivityCurvesProps) => {
  const [curveType, setCurveType] = useState<CurveType>('heartrate');

  // 检查数据可用性
  const hasHeartrate = streams?.heartrate && streams.heartrate.length > 0;
  const hasVelocity = streams?.velocity_smooth && streams.velocity_smooth.length > 0;
  const hasAltitude = streams?.altitude && streams.altitude.length > 0;

  const availableTypes: CurveType[] = useMemo(() => {
    const types: CurveType[] = [];
    if (hasHeartrate) types.push('heartrate');
    if (hasVelocity) types.push('pace');
    if (hasAltitude) types.push('altitude');
    return types;
  }, [hasHeartrate, hasVelocity, hasAltitude]);

  if (availableTypes.length === 0) {
    return (
      <div className={`${className || ''} text-center py-4`}>
        <span className="text-secondary text-sm">暂无曲线数据</span>
      </div>
    );
  }

  return (
    <div className={`${className || ''}`}>
      {/* 类型切换按钮 */}
      <div className="flex justify-center gap-2 mb-3">
        {availableTypes.map((type) => (
          <button
            key={type}
            onClick={() => setCurveType(type)}
            className={`px-3 py-1 text-xs font-bold rounded-full transition-all ${
              curveType === type
                ? type === 'heartrate'
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50'
                  : type === 'pace'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                : 'bg-gray-800/50 text-secondary hover:bg-gray-700/50'
            }`}
          >
            {type === 'heartrate' ? '心率' : type === 'pace' ? '配速' : '海拔'}
          </button>
        ))}
      </div>

      {/* SVG 曲线图 */}
      <div className="relative h-[120px] bg-gray-900/30 rounded-lg overflow-hidden">
        <CurveSVG
          streams={streams}
          curveType={curveType}
          totalDistance={totalDistance}
        />
      </div>
    </div>
  );
};

// 内部 SVG 组件
const CurveSVG = ({
  streams,
  curveType,
  totalDistance,
}: {
  streams?: ActivityStreams;
  curveType: CurveType;
  totalDistance: number;
}) => {
  const svgWidth = 300;
  const svgHeight = 120;
  const padding = { top: 10, bottom: 25, left: 5, right: 5 };

  const chartData = useMemo(() => {
    if (!streams) return null;

    let data: number[] = [];
    let yLabel = '';
    let color = '';

    switch (curveType) {
      case 'heartrate':
        data = streams.heartrate || [];
        yLabel = 'BPM';
        color = '#fb923c'; // orange-400
        break;
      case 'pace':
        data = (streams.velocity_smooth || []).map((v) =>
          v > 0 ? (1000 / v) / 60 : 0
        );
        yLabel = '/KM';
        color = '#60a5fa'; // blue-400
        break;
      case 'altitude':
        data = streams.altitude || [];
        yLabel = 'm';
        color = '#34d399'; // emerald-400
        break;
    }

    if (data.length === 0) return null;

    // 采样数据以避免渲染过多点
    const maxPoints = 100;
    const sampledData = data.length > maxPoints
      ? data.filter((_, i) => i % Math.ceil(data.length / maxPoints) === 0)
      : data;

    const minVal = Math.min(...sampledData.filter(v => Number.isFinite(v)));
    const maxVal = Math.max(...sampledData.filter(v => Number.isFinite(v)));
    const range = maxVal - minVal || 1;

    return {
      data: sampledData,
      minVal,
      maxVal,
      range,
      yLabel,
      color,
    };
  }, [streams, curveType]);

  if (!chartData) return null;

  const { data, minVal, maxVal, range, yLabel, color } = chartData;
  const chartWidth = svgWidth - padding.left - padding.right;
  const chartHeight = svgHeight - padding.top - padding.bottom;

  // 生成 SVG path 点
  const points = data.map((val, idx) => {
    const x = padding.left + (idx / (data.length - 1 || 1)) * chartWidth;
    const y = padding.top + chartHeight - ((val - minVal) / range) * chartHeight;
    return `${x},${Number.isFinite(y) ? y : chartHeight}`;
  });

  const pathD = `M ${points.join(' L ')}`;

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${svgWidth} ${svgHeight}`} preserveAspectRatio="xMidYMid meet">
      {/* 背景网格线 */}
      <line x1={padding.left} y1={padding.top} x2={padding.left} y2={svgHeight - padding.bottom} stroke="#374151" strokeWidth="0.5" />
      <line x1={padding.left} y1={svgHeight - padding.bottom} x2={svgWidth - padding.right} y2={svgHeight - padding.bottom} stroke="#374151" strokeWidth="0.5" />

      {/* Y轴标签 */}
      <text x={svgWidth - padding.right - 2} y={padding.top + 5} fill="#8E8E93" fontSize="8" textAnchor="end">
        {maxVal.toFixed(0)}{yLabel}
      </text>
      <text x={svgWidth - padding.right - 2} y={svgHeight - padding.bottom - 3} fill="#8E8E93" fontSize="8" textAnchor="end">
        {minVal.toFixed(0)}{yLabel}
      </text>

      {/* X轴标签（距离） */}
      <text x={padding.left} y={svgHeight - 5} fill="#8E8E93" fontSize="8">
        0km
      </text>
      <text x={svgWidth - padding.right} y={svgHeight - 5} fill="#8E8E93" fontSize="8" textAnchor="end">
        {(totalDistance / 1000).toFixed(1)}km
      </text>

      {/* 曲线 */}
      <path d={pathD} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
    </svg>
  );
};

export default ActivityCurves;
