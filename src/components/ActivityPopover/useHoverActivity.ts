import { useCallback } from 'react';
import { useActivityPopover, ActivityData } from './ActivityPopoverContext';

export const useHoverActivity = (data: ActivityData | null) => {
  const { showPopover, hidePopover } = useActivityPopover();

  const onMouseEnter = useCallback((e: React.MouseEvent) => {
    if (!data) return;
    const rect = e.currentTarget.getBoundingClientRect();
    showPopover(data, rect);
  }, [data, showPopover]);

  const onMouseLeave = useCallback(() => {
    // Pass delay to Context
    hidePopover(100);
  }, [hidePopover]);

  return { onMouseEnter, onMouseLeave };
};
