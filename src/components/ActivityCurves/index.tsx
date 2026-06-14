import React, { useMemo, useState, useRef } from 'react';
import { ActivityStreams } from '@/utils/utils';

interface HoverRange {
  startKm: number;
  endKm: number;
}

// 循环主题色
const KM_THEME_COLORS = [
  '#22d3ee', // cyan-400
  '#3b82f6', // blue-500
  '#a855f7', // purple-500
  '#f97316', // orange-500
  '#10b981', // emerald-500
  '#fb7185', // rose-400
  '#f59e0b', // amber-500
  '#6366f1', // indigo-500
];

const getKmColor = (km: number): string => KM_THEME_COLORS[(km - 1) % KM_THEME_COLORS.length];

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

  // 公里数 hover 状态
  const [hoveredKm, setHoveredKm] = useState<number | null>(null);
  const totalKm = totalDistance / 1000;
  const kmCount = Math.ceil(totalKm);

  // 计算高亮范围（优先使用外部传入的，否则使用内部 hover 的）
  const activeHighlightRange = highlightRange ?? (hoveredKm !== null ? {
    startKm: hoveredKm - 1,
    endKm: Math.min(hoveredKm, totalKm),
  } : null);

  if (!hasHeartrate && !hasVelocity && !hasAltitude) {
    return (
      <div className={`${className || ''} text-center py-4`}>
        <span className="text-secondary text-sm">暂无曲线数据</span>
      </div>
    );
  }

  return (
    <div className={`${className || ''} flex flex-col gap-4`}>
      {/* 公里数分段条形图 - 仿照有氧区间设计 */}
      {kmCount > 1 && (
        <div className="flex flex-col items-center w-full">
          <span className="font-sans text-[9px] md:text-[10px] font-bold text-secondary uppercase tracking-wider mb-2">
            KM Split
          </span>
          <div className="flex flex-col gap-1.5 w-full max-w-[320px]">
            {/* 条形图 */}
            <div className="flex h-3.5 rounded-lg overflow-hidden bg-gray-800/50">
              {Array.from({ length: kmCount }, (_, i) => i + 1).map((km) => {
                const isHighlighted = hoveredKm === km;
                // 最后一公里的宽度可能不是整数
                const isLastKm = km === kmCount;
                const widthPercent = isLastKm && totalKm < kmCount
                  ? `${((totalKm - (km - 1)) / kmCount) * 100}%`
                  : `${100 / kmCount}%`;

                const baseColor = getKmColor(km);

                return (
                  <div
                    key={km}
                    className="h-full transition-all duration-300 cursor-pointer"
                    style={{
                      backgroundColor: baseColor,
                      width: widthPercent,
                      opacity: isHighlighted ? 1 : 0.35,
                      boxShadow: isHighlighted ? `0 0 12px ${baseColor}50` : 'none',
                    }}
                    onMouseEnter={() => setHoveredKm(km)}
                    onMouseLeave={() => setHoveredKm(null)}
                  />
                );
              })}
            </div>
            {/* 底部公里标签 */}
            <div className="flex justify-between text-[9px] font-bold px-0.5">
              {Array.from({ length: kmCount }, (_, i) => i + 1).map((km) => {
                const isHighlighted = hoveredKm === km;
                const labelColor = getKmColor(km);

                return (
                  <span
                    key={km}
                    className={`transition-all duration-300 ${
                      isHighlighted ? 'font-black scale-110' : 'font-bold'
                    }`}
                    style={{
                      color: isHighlighted ? labelColor : '#8E8E93',
                    }}
                  >
                    {km}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      )}
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
              highlightRange={activeHighlightRange}
              isHighlighted={hoveredKm !== null}
              highlightColor={hoveredKm ? getKmColor(hoveredKm) : undefined}
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
              highlightRange={activeHighlightRange}
              isHighlighted={hoveredKm !== null}
              highlightColor={hoveredKm ? getKmColor(hoveredKm) : undefined}
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
              highlightRange={activeHighlightRange}
              isHighlighted={hoveredKm !== null}
              highlightColor={hoveredKm ? getKmColor(hoveredKm) : undefined}
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
  isHighlighted,
  highlightColor,
}: {
  streams?: ActivityStreams;
  curveType: 'heartrate' | 'pace' | 'altitude';
  totalDistance: number;
  highlightRange?: HoverRange | null;
  isHighlighted?: boolean;
  highlightColor?: string;
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

  const { data, minVal, maxVal, range, unit, color } = chartData;
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
        const kmTotal = totalDistance / 1000;
        const startX = padding.left + (highlightRange.startKm / kmTotal) * chartWidth;
        const endX = padding.left + (highlightRange.endKm / kmTotal) * chartWidth;
        const hlColor = highlightColor || color;

        return (
          <>
            {/* 背景遮罩 - 非高亮区域变暗 */}
            {isHighlighted && (
              <>
                <rect
                  x={padding.left}
                  y={padding.top}
                  width={startX - padding.left}
                  height={chartHeight}
                  fill="#000"
                  opacity="0.4"
                />
                <rect
                  x={endX}
                  y={padding.top}
                  width={chartWidth - (endX - padding.left)}
                  height={chartHeight}
                  fill="#000"
                  opacity="0.4"
                />
              </>
            )}
            {/* 高亮区域背景 */}
            <rect
              x={startX}
              y={padding.top}
              width={endX - startX}
              height={chartHeight}
              fill={hlColor}
              opacity="0.25"
              rx="2"
            />
            {/* 高亮区域边框 */}
            <line
              x1={startX}
              y1={padding.top}
              x2={startX}
              y2={svgHeight - padding.bottom}
              stroke={hlColor}
              strokeWidth="2"
              opacity="0.6"
            />
            <line
              x1={endX}
              y1={padding.top}
              x2={endX}
              y2={svgHeight - padding.bottom}
              stroke={hlColor}
              strokeWidth="2"
              opacity="0.6"
            />
          </>
        );
      })()}

      {/* Curve - 当有高亮时，曲线整体变暗，但高亮部分通过叠加路径显示 */}
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={isHighlighted ? "0.35" : "0.95"}
      />

      {/* 高亮部分的曲线 - 更亮更粗 */}
      {highlightRange && (() => {
        const kmTotal = totalDistance / 1000;
        const startRatio = highlightRange.startKm / kmTotal;
        const endRatio = highlightRange.endKm / kmTotal;

        // 计算高亮部分的起止索引
        const startIdx = Math.floor(startRatio * (data.length - 1));
        const endIdx = Math.ceil(endRatio * (data.length - 1));

        // 生成高亮部分的路径点
        const highlightPoints = data.slice(startIdx, endIdx + 1).map((val, idx) => {
          const actualIdx = startIdx + idx;
          const x = padding.left + (actualIdx / (data.length - 1 || 1)) * chartWidth;
          const y = padding.top + chartHeight - ((val - minVal) / range) * chartHeight;
          return `${x},${Number.isFinite(y) ? y : chartHeight}`;
        });

        if (highlightPoints.length < 2) return null;

        const highlightPathD = `M ${highlightPoints.join(' L ')}`;
        const hlColor = highlightColor || color;

        return (
          <path
            d={highlightPathD}
            fill="none"
            stroke={hlColor}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="1"
            filter={`drop-shadow(0 0 4px ${hlColor}80)`}
          />
        );
      })()}

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