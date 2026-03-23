import { useEffect, useLayoutEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useActivityPopover } from './ActivityPopoverContext';
import { convertMovingTime2Sec, formatPace } from '@/utils/utils';
import ActivityIcon from '@/components/ActivityIcon';

export {
  ActivityPopoverProvider,
  useActivityPopover,
} from './ActivityPopoverContext';
export { useHoverActivity } from './useHoverActivity';
export type { ActivityData } from './ActivityPopoverContext';

// Wider popover for horizontal layout
const POPOVER_WIDTH = 300;
const GAP = 8; // Margin from edges

const formatDuration = (seconds: number) => {
  if (!seconds) return '0m';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const formatTimeRange = (startDateLocal: string, durationSeconds: number) => {
  try {
    // start_date_local format: "YYYY-MM-DD HH:MM:SS"
    const startDate = new Date(startDateLocal.replace(' ', 'T'));
    const endDate = new Date(startDate.getTime() + durationSeconds * 1000);

    const formatTime = (date: Date) => {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    };

    return `${formatTime(startDate)} - ${formatTime(endDate)}`;
  } catch (e) {
    return '';
  }
};

// SVG Icons for stats
const DistanceIcon = () => (
  <svg
    className="w-3 h-3"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
    />
  </svg>
);

const PaceIcon = () => (
  <svg
    className="w-3 h-3"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const TimeIcon = () => (
  <svg
    className="w-3 h-3"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const HeartRateIcon = () => (
  <svg
    className="w-3 h-3"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
    />
  </svg>
);

export const ActivityPopover = () => {
  const { activityData, anchorRect, isVisible } = useActivityPopover();
  const [style, setStyle] = useState<React.CSSProperties>({});
  const popoverRef = useRef<HTMLDivElement>(null);

  // We keep the last valid data to show during fade-out animation
  const [renderData, setRenderData] = useState(activityData);

  useEffect(() => {
    if (activityData) {
      setRenderData(activityData);
    }
  }, [activityData]);

  useLayoutEffect(() => {
    if (isVisible && anchorRect) {
      // Use the ref to get dimensions if available, or fallback
      const popoverHeight = popoverRef.current?.offsetHeight || 120;

      // Initial Position: Center below anchor
      let left = anchorRect.left + anchorRect.width / 2 - POPOVER_WIDTH / 2;
      let top = anchorRect.bottom + GAP;

      // Horizontal Constraints
      if (left < GAP) {
        left = GAP;
      } else if (left + POPOVER_WIDTH > window.innerWidth - GAP) {
        left = window.innerWidth - POPOVER_WIDTH - GAP;
      }

      // Vertical Constraints
      // Check if it fits below, otherwise flip to top
      if (top + popoverHeight > window.innerHeight - GAP) {
        top = anchorRect.top - popoverHeight - GAP;
      }

      setStyle({
        left: `${left}px`,
        top: `${top}px`,
      });
    }
  }, [isVisible, anchorRect, renderData]);

  // Don't render anything if we never had data
  if (!renderData) return null;

  const { run, title, totalDistanceKm, totalSeconds, achievement } = renderData;
  const distanceKm = totalDistanceKm ?? run.distance / 1000;
  const seconds = totalSeconds ?? convertMovingTime2Sec(run.moving_time);
  const paceText =
    distanceKm > 0
      ? formatPace((distanceKm * 1000) / Math.max(1, seconds))
      : '-';

  const timeRange = formatTimeRange(run.start_date_local, seconds);

  return createPortal(
    <div
      ref={popoverRef}
      className={`fixed z-[9999] pointer-events-none transition-all duration-200 ease-out will-change-transform
        ${
          isVisible
            ? 'opacity-100 translate-y-0 scale-100'
            : 'opacity-0 translate-y-1 scale-95'
        }`}
      style={style}
    >
      <div
        className={`w-[${POPOVER_WIDTH}px] rounded-xl border border-white/10 bg-gray-900/95 backdrop-blur-md p-3 shadow-2xl shadow-black/50`}
      >
        {/* Header Section */}
        <div className="flex items-start justify-between mb-3 pb-3 border-b border-white/10">
          <div className="flex items-start gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center text-primary/80 shrink-0 border border-white/5">
              <ActivityIcon type={run.type} />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="font-bold text-white text-sm truncate leading-tight">
                {run.name || 'Untitled Activity'}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-gray-400 font-medium bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                  {title}
                </span>
                {timeRange && (
                  <span className="text-[10px] text-gray-500 font-mono">
                    {timeRange}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid - Horizontal Layout */}
        <div className="grid grid-cols-4 gap-2">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1 text-[10px] text-gray-500 font-bold tracking-wider uppercase">
              <span className="text-emerald-500">
                <DistanceIcon />
              </span>
              KM
            </div>
            <div className="text-base font-bold text-emerald-400 tabular-nums leading-none">
              {distanceKm.toFixed(2)}
            </div>
          </div>

          <div className="flex flex-col gap-0.5 border-l border-white/5 pl-2">
            <div className="flex items-center gap-1 text-[10px] text-gray-500 font-bold tracking-wider uppercase">
              <span className="text-blue-500">
                <PaceIcon />
              </span>
              Pace
            </div>
            <div className="text-base font-bold text-blue-400 tabular-nums leading-none">
              {paceText}
            </div>
          </div>

          <div className="flex flex-col gap-0.5 border-l border-white/5 pl-2">
            <div className="flex items-center gap-1 text-[10px] text-gray-500 font-bold tracking-wider uppercase">
              <span className="text-amber-500">
                <TimeIcon />
              </span>
              Time
            </div>
            <div className="text-base font-bold text-amber-400 tabular-nums leading-none">
              {formatDuration(seconds)}
            </div>
          </div>

          <div className="flex flex-col gap-0.5 border-l border-white/5 pl-2">
            <div className="flex items-center gap-1 text-[10px] text-gray-500 font-bold tracking-wider uppercase">
              <span className="text-rose-500">
                <HeartRateIcon />
              </span>
              BPM
            </div>
            <div className="text-base font-bold text-rose-500 tabular-nums leading-none">
              {run.average_heartrate?.toFixed(0) || '--'}
            </div>
          </div>
        </div>

        {/* Achievement Badge */}
        {achievement && (
          <div
            className={`mt-3 pt-2 border-t border-white/10 flex items-center gap-2 ${achievement.colorClass}`}
          >
            <span className="material-icons text-sm">{achievement.icon}</span>
            <span className="text-xs font-bold">{achievement.description}</span>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
