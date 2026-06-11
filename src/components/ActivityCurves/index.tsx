import { useMemo } from 'react';
import { ActivityStreams, formatPace, computeKmSplitsFromStreams } from '@/utils/utils';

interface ActivityCurvesProps {
  streams?: ActivityStreams;
  totalDistance: number;
  className?: string;
}

const ActivityCurves = ({ streams, totalDistance, className }: ActivityCurvesProps) => {
  // 检查数据可用性
  const hasHeartrate = streams?.heartrate && streams.heartrate.length > 0;
  const hasVelocity = streams?.velocity_smooth && streams.velocity_smooth.length > 0;
  const hasAltitude = streams?.altitude && streams.altitude.length > 0;

  if (!hasHeartrate && !hasVelocity && !hasAltitude) {
    return (
      <div className={`${className || ''} text-center py-4`}>
        <span className="text-secondary text-sm">暂无曲线数据</span>
      </div>
    );
  }

  return (
    <div className={`${className || ''} flex flex-col gap-4`}>
      {/* 心率曲线 */}
      {hasHeartrate && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm md:text-base font-black italic uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-200">
            心率
          </h3>
          <div className="relative h-[140px] w-full rounded-lg overflow-hidden">
            <CurveSVG
              streams={streams}
              curveType="heartrate"
              totalDistance={totalDistance}
            />
          </div>
        </div>
      )}

      {/* 配速曲线 */}
      {hasVelocity && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm md:text-base font-black italic uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-200">
            配速
          </h3>
          <div className="relative h-[140px] w-full rounded-lg overflow-hidden">
            <CurveSVG
              streams={streams}
              curveType="pace"
              totalDistance={totalDistance}
            />
          </div>
        </div>
      )}

      {/* 海拔曲线 */}
      {hasAltitude && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm md:text-base font-black italic uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">
            海拔
          </h3>
          <div className="relative h-[140px] w-full rounded-lg overflow-hidden">
            <CurveSVG
              streams={streams}
              curveType="altitude"
              totalDistance={totalDistance}
            />
          </div>
        </div>
      )}
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
  curveType: 'heartrate' | 'pace' | 'altitude';
  totalDistance: number;
}) => {
  const svgWidth = 500; // 增加基础宽度，通过 viewBox 缩放适配
  const svgHeight = 140;
  const padding = { top: 15, bottom: 30, left: 10, right: 10 };

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

  // Generate nice Y-axis ticks (3-5 levels)
  const generateNiceTicks = (min: number, max: number, targetCount = 4): number[] => {
    const rawRange = max - min;
    if (rawRange === 0) return [min];

    // Find a nice round step size
    const roughStep = rawRange / (targetCount - 1);
    const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));

    let niceStep: number;
    if (roughStep <= magnitude) niceStep = magnitude;
    else if (roughStep <= 2 * magnitude) niceStep = 2 * magnitude;
    else if (roughStep <= 5 * magnitude) niceStep = 5 * magnitude;
    else niceStep = 10 * magnitude;

    // Calculate start and end values
    let start = Math.floor(min / niceStep) * niceStep;
    let end = Math.ceil(max / niceStep) * niceStep;

    // Ensure we have reasonable bounds
    const ticks: number[] = [];
    for (let val = start; val <= end; val += niceStep) {
      ticks.push(val);
      if (ticks.length > 6) break; // Safety limit
    }

    // Filter to keep within original range
    return ticks.filter(t => t >= min && t <= max);
  };

  const yTicks = generateNiceTicks(minVal, maxVal, 4);

  // Generate X-axis distance ticks based on total distance
  const generateDistanceTicks = (totalKm: number): number[] => {
    if (totalKm <= 0) return [0];

    const targetCount = totalKm < 5 ? 3 : totalKm < 10 ? 4 : 5;
    const roughStep = totalKm / (targetCount - 1);

    // Round to nice numbers
    let step: number;
    if (roughStep < 1) step = 0.5;
    else if (roughStep < 2) step = 1;
    else if (roughStep < 5) step = 2;
    else if (roughStep < 10) step = 5;
    else step = 10;

    const ticks: number[] = [];
    for (let d = 0; d <= totalKm; d += step) {
      ticks.push(d);
      if (ticks.length > 7) break;
    }

    // Always include the last point
    if (ticks[ticks.length - 1] !== totalKm) {
      ticks.push(totalKm);
    }

    return ticks;
  };

  const totalKm = totalDistance / 1000;
  const xTicks = generateDistanceTicks(totalKm);

  // Generate SVG path points
  const points = data.map((val, idx) => {
    const x = padding.left + (idx / (data.length - 1 || 1)) * chartWidth;
    const y = padding.top + chartHeight - ((val - minVal) / range) * chartHeight;
    return `${x},${Number.isFinite(y) ? y : chartHeight}`;
  });

  const pathD = `M ${points.join(' L ')}`;

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${svgWidth} ${svgHeight}`} preserveAspectRatio="xMidYMid meet">
      {/* Horizontal grid lines */}
      {yTicks.map((tick, i) => {
        const y = padding.top + chartHeight - ((tick - minVal) / range) * chartHeight;
        return (
          <line
            key={`hgrid-${i}`}
            x1={padding.left}
            y1={y}
            x2={svgWidth - padding.right}
            y2={y}
            stroke="#374151"
            strokeWidth="0.5"
            opacity="0.3"
            strokeDasharray="2,2"
          />
        );
      })}

      {/* Vertical grid lines for distance */}
      {xTicks.map((tick, i) => {
        const x = padding.left + (tick / totalKm) * chartWidth;
        return (
          <line
            key={`vgrid-${i}`}
            x1={x}
            y1={padding.top}
            x2={x}
            y2={svgHeight - padding.bottom}
            stroke="#374151"
            strokeWidth="0.5"
            opacity="0.3"
            strokeDasharray="2,2"
          />
        );
      })}

      {/* Axes */}
      <line x1={padding.left} y1={padding.top} x2={padding.left} y2={svgHeight - padding.bottom} stroke="#374151" strokeWidth="1" opacity="0.5" />
      <line x1={padding.left} y1={svgHeight - padding.bottom} x2={svgWidth - padding.right} y2={svgHeight - padding.bottom} stroke="#374151" strokeWidth="1" opacity="0.5" />

      {/* Y-axis labels */}
      {yTicks.map((tick, i) => {
        const y = padding.top + chartHeight - ((tick - minVal) / range) * chartHeight;
        return (
          <text
            key={`ylabel-${i}`}
            x={svgWidth - padding.right - 5}
            y={y - 4}
            fill="#8E8E93"
            fontSize="9"
            fontWeight="600"
            textAnchor="end"
          >
            {tick.toFixed(0)} {yLabel}
          </text>
        );
      })}

      {/* X-axis labels (distance) */}
      {xTicks.map((tick, i) => {
        const x = padding.left + (tick / totalKm) * chartWidth;
        return (
          <text
            key={`xlabel-${i}`}
            x={x}
            y={svgHeight - 8}
            fill="#8E8E93"
            fontSize="9"
            fontWeight="600"
            textAnchor="middle"
          >
            {tick % 1 === 0 ? tick : tick.toFixed(1)} km
          </text>
        );
      })}

      {/* Curve */}
      <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.95" />
    </svg>
  );
};

export default ActivityCurves;
