import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
  useRef,
} from 'react';
import { Activity } from '@/utils/utils';

export interface ActivityData {
  title: string;
  run: Activity;
  totalDistanceKm: number;
  totalSeconds: number;
  // Optional label for PB or special achievement
  achievement?: {
    label: string;
    description: string;
    icon: string;
    colorClass: string;
  };
}

interface ActivityPopoverContextType {
  activityData: ActivityData | null;
  anchorRect: DOMRect | null;
  isVisible: boolean;
  showPopover: (data: ActivityData, rect: DOMRect) => void;
  hidePopover: (delay?: number) => void;
}

const ActivityPopoverContext = createContext<
  ActivityPopoverContextType | undefined
>(undefined);

export const ActivityPopoverProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [activityData, setActivityData] = useState<ActivityData | null>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showPopover = useCallback((data: ActivityData, rect: DOMRect) => {
    // Clear any pending hide timer
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
    setActivityData(data);
    setAnchorRect(rect);
    setIsVisible(true);
  }, []);

  const hidePopover = useCallback((delay: number = 200) => {
    // Clear any existing timer to avoid multiple hides
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }

    if (delay > 0) {
      hideTimerRef.current = setTimeout(() => {
        setIsVisible(false);
        hideTimerRef.current = null;
      }, delay);
    } else {
      setIsVisible(false);
    }
  }, []);

  return (
    <ActivityPopoverContext.Provider
      value={{ activityData, anchorRect, isVisible, showPopover, hidePopover }}
    >
      {children}
    </ActivityPopoverContext.Provider>
  );
};

export const useActivityPopover = () => {
  const context = useContext(ActivityPopoverContext);
  if (!context) {
    throw new Error(
      'useActivityPopover must be used within an ActivityPopoverProvider'
    );
  }
  return context;
};
