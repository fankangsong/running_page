import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ActivityPopoverProvider,
  ActivityPopover,
  useHoverActivity,
} from './index';
import { Activity } from '@/utils/utils';

// Mock ReactDOM.createPortal
vi.mock('react-dom', async () => {
  const actual = await vi.importActual('react-dom');
  return {
    ...actual,
    createPortal: (node: React.ReactNode, _container: Element) => node,
  };
});

// Mock Activity Data
const mockActivity: Activity = {
  run_id: 1,
  name: 'Test Run',
  distance: 5000,
  moving_time: '00:25:00',
  type: 'Run',
  start_date_local: '2023-01-01 10:00:00',
  summary_polyline: 'encoded_polyline',
  average_heartrate: 150,
  average_speed: 10,
  streak: 1,
};

const mockActivityData = {
  title: '2023-01-01',
  run: mockActivity,
  totalDistanceKm: 5,
  totalSeconds: 1500,
};

// Helper component to test hook
const TestComponent = ({ data }: { data: any }) => {
  const { onMouseEnter, onMouseLeave } = useHoverActivity(data);
  return (
    <div
      data-testid="trigger"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      Hover me
    </div>
  );
};

describe('ActivityPopover', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should not render popover initially', () => {
    render(
      <ActivityPopoverProvider>
        <ActivityPopover />
      </ActivityPopoverProvider>
    );
    // Popover content should not be visible
    expect(screen.queryByText('Test Run')).not.toBeInTheDocument();
  });

  it('should show popover on hover', () => {
    render(
      <ActivityPopoverProvider>
        <TestComponent data={mockActivityData} />
        <ActivityPopover />
      </ActivityPopoverProvider>
    );

    const trigger = screen.getByTestId('trigger');
    fireEvent.mouseEnter(trigger);

    // Should appear
    expect(screen.getByText('Test Run')).toBeInTheDocument();
    expect(screen.getByText('5.00')).toBeInTheDocument(); // Distance
  });

  it('should hide popover on mouse leave after delay', () => {
    render(
      <ActivityPopoverProvider>
        <TestComponent data={mockActivityData} />
        <ActivityPopover />
      </ActivityPopoverProvider>
    );

    const trigger = screen.getByTestId('trigger');

    // Enter
    fireEvent.mouseEnter(trigger);
    expect(screen.getByText('Test Run')).toBeInTheDocument();

    // Leave
    fireEvent.mouseLeave(trigger);

    // Should still be there immediately (delay)
    expect(screen.getByText('Test Run')).toBeInTheDocument();

    // Fast forward time
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Should be gone (or strictly, opacity 0 / removed from DOM depending on implementation)
    // In our implementation, we keep it in DOM for fade out but it might be removed by conditional rendering if we handled it that way.
    // Wait, in index.tsx:
    // if (!renderData) return null;
    // renderData is state.
    // hidePopover sets isVisible=false.
    // The component stays rendered but with opacity-0 class.

    const popover = screen.getByText('Test Run').closest('.fixed');
    expect(popover).toHaveClass('opacity-0');
  });

  it('should update position on hover', () => {
    render(
      <ActivityPopoverProvider>
        <TestComponent data={mockActivityData} />
        <ActivityPopover />
      </ActivityPopoverProvider>
    );

    const trigger = screen.getByTestId('trigger');
    // Mock getBoundingClientRect
    trigger.getBoundingClientRect = vi.fn(
      () =>
        ({
          top: 100,
          left: 100,
          bottom: 150,
          right: 150,
          width: 50,
          height: 50,
        } as DOMRect)
    );

    fireEvent.mouseEnter(trigger);

    const popover = screen.getByText('Test Run').closest('.fixed');
    expect(popover).toHaveStyle({ left: '15px' }); // Calculation logic check
    // left = 100 + 25 - 110 = 15. Correct.
  });
});
