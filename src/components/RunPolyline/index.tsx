import { useMemo } from 'react';
import { pathForRun } from '@/utils/utils';
import { MAIN_COLOR } from '@/utils/const';
import { Activity } from '@/utils/utils';
import { ReactComponent as StartIcon } from '@assets/start.svg';
import { ReactComponent as EndIcon } from '@assets/end.svg';

interface IRunPolylineProps {
  run: Activity;
  className?: string;
}

const RunPolyline = ({ run, className }: IRunPolylineProps) => {
  const svgWidth = 210;
  const svgHeight = 210;

  const { points, offsetX, offsetY } = useMemo(() => {
    const coords = pathForRun(run);
    if (coords.length === 0) {
      return { points: [], bounds: null, offsetX: 0, offsetY: 0 };
    }

    const lons = coords.map((c) => c[0]);
    const lats = coords.map((c) => c[1]);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);

    const lonRange = maxLon - minLon || 1;
    const latRange = maxLat - minLat || 1;

    const padding = 10;

    // Calculate the actual content size after scaling
    const contentWidth = svgWidth - 2 * padding;
    const contentHeight = svgHeight - 2 * padding;

    const scaleX = (lon: number) =>
      padding + ((lon - minLon) / lonRange) * contentWidth;
    const scaleY = (lat: number) =>
      padding + ((lat - minLat) / latRange) * contentHeight;

    const points = coords.map((coord) => {
      const x = scaleX(coord[0]);
      const y = scaleY(coord[1]);
      return { x, y };
    });

    // Calculate bounding box of the drawn path
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    // Center the path within the SVG by calculating offset
    const contentActualWidth = maxX - minX;
    const contentActualHeight = maxY - minY;
    const offsetX = (svgWidth - contentActualWidth) / 2 - minX;
    const offsetY = (svgHeight - contentActualHeight) / 2 - minY;

    return {
      points,
      offsetX,
      offsetY,
    };
  }, [run]);

  if (points.length === 0) {
    return null;
  }

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');
  const startPoint = points[0];
  const endPoint = points[points.length - 1];

  return (
    <svg
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      className={className ?? 'w-full h-full'}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="trailGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={MAIN_COLOR} stopOpacity="0.3" />
          <stop offset="50%" stopColor={MAIN_COLOR} stopOpacity="0.8" />
          <stop offset="100%" stopColor={MAIN_COLOR} stopOpacity="0.3" />
        </linearGradient>
      </defs>

      <g transform={`translate(${offsetX}, ${offsetY})`}>
        <polyline
          points={polylinePoints}
          fill="none"
          stroke={MAIN_COLOR}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.9"
        />

        <g transform={`translate(${startPoint.x - 12}, ${startPoint.y - 24})`}>
          <StartIcon width="24" height="24" />
        </g>

        <g transform={`translate(${endPoint.x - 12}, ${endPoint.y - 24})`}>
          <EndIcon width="24" height="24" />
        </g>
      </g>
    </svg>
  );
};

export default RunPolyline;
