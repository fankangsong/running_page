import { useMemo, useState, useRef } from 'react';
import { ActivityStreams, formatPace } from '@/utils/utils';

interface HoverRange {
  startKm: number;
  endKm: number;
}

interface ActivityCurvesProps {
  streams?: ActivityStreams;
  totalDistance: number;
  className?: string;
  highlightRange?: HoverRange | null;
}

const ActivityCurves = ({ streams, totalDistance, className, highlightRange }: ActivityCurvesProps) => {
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
              highlightRange={highlightRange}
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
              highlightRange={highlightRange}
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
              highlightRange={highlightRange}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// 格式化配速值（分钟/公里）
const formatPaceValue = (paceMinPerKm: number): string => {
  if (!Number.isFinite(paceMinPerKm) || paceMinPerKm <= 0) return '--';
  const mins = Math.floor(paceMinPerKm);
  const secs = Math.round((paceMinPerKm - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// 内部 SVG 组件
const CurveSVG = ({
  streams,
  curveType,
  totalDistance,
  highlightRange,
}: {
  streams?: ActivityStreams;
  curveType: 'heartrate' | 'pace' | 'altitude';
  totalDistance: number;
  highlightRange?: HoverRange | null;
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverData, setHoverData] = useState<{
    x: number;
    y: number;
    value: number;
    distance: number;
    index: number;
  } | null>(null);

  const svgWidth = 500;
  const svgHeight = 140;
  const padding = { top: 15, bottom: 30, left: 10, right: 10 };

  const chartData = useMemo(() => {
    if (!streams) return null;

    let data: number[] = [];
    let yLabel = '';
    let color = '';
    let unit = '';

    switch (curveType) {
      case 'heartrate':
        data = streams.heartrate || [];
        yLabel = '心率';
        unit = 'BPM';
        color = '#fb923c'; // orange-400
        break;
      case 'pace':
        data = (streams.velocity_smooth || []).map((v) =>
          v > 0 ? (1000 / v) / 60 : 0
        );
        yLabel = '配速';
        unit = '/km';
        color = '#60a5fa'; // blue-400
        break;
      case 'altitude':
        data = streams.altitude || [];
        yLabel = '海拔';
        unit = 'm';
        color = '#34d399'; // emerald-400
        break;
    }

    if (data.length === 0) return null;

    // 采样数据以避免渲染过多点
    const maxPoints = 100;
    const step = data.length > maxPoints ? Math.ceil(data.length / maxPoints) : 1;
    const sampledData = data.length > maxPoints
      ? data.filter((_, i) => i % step === 0)
      : data;

    const minVal = Math.min(...sampledData.filter(v => Number.isFinite(v)));
    const maxVal = Math.max(...sampledData.filter(v => Number.isFinite(v)));
    const range = maxVal - minVal || 1;

    return {
      data: sampledData,
      originalData: data,
      originalLength: data.length,
      sampleStep: step,
      minVal,
      maxVal,
      range,
      yLabel,
      unit,
      color,
    };
  }, [streams, curveType]);

  if (!chartData) return null;

  const { data, minVal, maxVal, range, yLabel, unit, color } = chartData;
  const chartWidth = svgWidth - padding.left - padding.right;
  const chartHeight = svgHeight - padding.top - padding.bottom;

  // Generate nice Y-axis ticks (3-5 levels)
  const generateNiceTicks = (min: number, max: number, targetCount = 4): number[] => {
    const rawRange = max - min;
    if (rawRange === 0) return [min];

    const roughStep = rawRange / (targetCount - 1);
    const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));

    let niceStep: number;
    if (roughStep <= magnitude) niceStep = magnitude;
    else if (roughStep <= 2 * magnitude) niceStep = 2 * magnitude;
    else if (roughStep <= 5 * magnitude) niceStep = 5 * magnitude;
    else niceStep = 10 * magnitude;

    let start = Math.floor(min / niceStep) * niceStep;
    let end = Math.ceil(max / niceStep) * niceStep;

    const ticks: number[] = [];
    for (let val = start; val <= end; val += niceStep) {
      ticks.push(val);
      if (ticks.length > 6) break;
    }

    return ticks.filter(t => t >= min && t <= max);
  };

  const yTicks = generateNiceTicks(minVal, maxVal, 4);

  // Generate X-axis distance ticks
  const generateDistanceTicks = (totalKm: number): number[] => {
    if (totalKm <= 0) return [0];

    const targetCount = totalKm < 5 ? 3 : totalKm < 10 ? 4 : 5;
    const roughStep = totalKm / (targetCount - 1);

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

  // Handle mouse move
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || !chartData) return;

    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = svgWidth / rect.width;
    const mouseX = (e.clientX - rect.left) * scaleX;

    // Calculate position within chart area
    const chartX = mouseX - padding.left;
    if (chartX < 0 || chartX > chartWidth) {
      setHoverData(null);
      return;
    }

    // Calculate index in sampled data
    const ratio = chartX / chartWidth;
    const sampledIndex = Math.round(ratio * (data.length - 1));

    // Calculate original index for distance
    const originalIndex = chartData.sampleStep > 1
      ? sampledIndex * chartData.sampleStep
      : sampledIndex;

    // Get value from sampled data
    const value = data[sampledIndex];

    // Calculate distance at this point
    const distance = (originalIndex / (chartData.originalLength - 1 || 1)) * totalKm;

    // Calculate Y position for the point
    const pointY = padding.top + chartHeight - ((value - minVal) / range) * chartHeight;

    setHoverData({
      x: padding.left + sampledIndex / (data.length - 1 || 1) * chartWidth,
      y: Number.isFinite(pointY) ? pointY : chartHeight + padding.top,
      value,
      distance,
      index: sampledIndex,
    });
  };

  const handleMouseLeave = () => {
    setHoverData(null);
  };

  // Format value for display
  const formatValue = (val: number): string => {
    if (!Number.isFinite(val)) return '--';
    switch (curveType) {
      case 'heartrate':
        return `${Math.round(val)} ${unit}`;
      case 'pace':
        return `${formatPaceValue(val)} ${unit}`;
      case 'altitude':
        return `${val.toFixed(1)} ${unit}`;
      default:
        return `${val.toFixed(1)} ${unit}`;
    }
  };

  return (
    <svg
      ref={svgRef}
      width="100%"
      height="100%"
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      preserveAspectRatio="xMidYMid meet"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="cursor-crosshair"
    >
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
            {tick.toFixed(0)} {unit}
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

      {/* Highlight range from lap hover */}
      {highlightRange && (() => {
        const totalKm = totalDistance / 1000;
        const startX = padding.left + (highlightRange.startKm / totalKm) * chartWidth;
        const endX = padding.left + (highlightRange.endKm / totalKm) * chartWidth;

        return (
          <rect
            x={startX}
            y={padding.top}
            width={endX - startX}
            height={chartHeight}
            fill={color}
            opacity="0.15"
            rx="2"
          />
        );
      })()}

      {/* Curve */}
      <path d={pathD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.95" />

      {/* Hover indicator */}
      {hoverData && (() => {
        const tooltipWidth = 85;
        const tooltipHeight = 40;
        const tooltipGap = 8;
        const rightBoundary = svgWidth - padding.right;

        // Determine if tooltip should be on left side
        const showOnLeft = hoverData.x + tooltipGap + tooltipWidth > rightBoundary;

        // Calculate tooltip position
        const tooltipX = showOnLeft
          ? hoverData.x - tooltipGap - tooltipWidth
          : hoverData.x + tooltipGap;

        // Text anchor position (center of tooltip)
        const textCenterX = tooltipX + tooltipWidth / 2;

        return (
          <>
            {/* Vertical line at hover position */}
            <line
              x1={hoverData.x}
              y1={padding.top}
              x2={hoverData.x}
              y2={svgHeight - padding.bottom}
              stroke={color}
              strokeWidth="1"
              opacity="0.5"
            />

            {/* Point marker */}
            <circle
              cx={hoverData.x}
              cy={hoverData.y}
              r="5"
              fill={color}
              stroke="#fff"
              strokeWidth="2"
              opacity="0.9"
            />

            {/* Tooltip background */}
            <rect
              x={tooltipX}
              y={hoverData.y - 25}
              width={tooltipWidth}
              height={tooltipHeight}
              rx="6"
              fill="#1C1C1E"
              stroke={color}
              strokeWidth="1"
              opacity="0.95"
            />

            {/* Tooltip text - value */}
            <text
              x={textCenterX}
              y={hoverData.y - 10}
              fill="#fff"
              fontSize="12"
              fontWeight="700"
              textAnchor="middle"
            >
              {formatValue(hoverData.value)}
            </text>

            {/* Tooltip text - distance */}
            <text
              x={textCenterX}
              y={hoverData.y + 8}
              fill="#8E8E93"
              fontSize="10"
              fontWeight="500"
              textAnchor="middle"
            >
              {hoverData.distance.toFixed(2)} km
            </text>
          </>
        );
      })()}
    </svg>
  );
};

export default ActivityCurves;