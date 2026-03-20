import React from 'react';
import { Dimensions } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import { FAB } from './FAB';
import {
  FAB_DRAG_ACTIVE_OPACITY,
  FAB_DRAG_THRESHOLD,
  FAB_EDGE_MARGIN,
  FAB_IDLE_OPACITY,
  clampFabPosition,
  getFabBounds,
  snapFabPosition,
} from './fabPosition';
import * as fabPosition from './fabPosition';

jest.mock('../../theme/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      accent: '#FF2D78',
      card: '#111827',
      textMain: '#F8FAFC',
    },
  }),
}));

jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    Plus: ({ color }: { color: string }) => <Text>{color}</Text>,
  };
});

const SCREEN = {
  width: 360,
  height: 640,
  scale: 2,
  fontScale: 2,
};

describe('FAB helpers and interactions', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Dimensions, 'get').mockReturnValue(SCREEN);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('clamps vertical position and snaps to the nearest edge across screen sizes', () => {
    expect(
      clampFabPosition(
        { x: -40, y: 999 },
        { width: 320, height: 500 },
      ),
    ).toEqual({ x: FAB_EDGE_MARGIN, y: 364 });

    expect(
      snapFabPosition(
        { x: 30, y: 999 },
        { width: 360, height: 640 },
      ),
    ).toEqual({ x: FAB_EDGE_MARGIN, y: 504 });

    expect(
      snapFabPosition(
        { x: 260, y: -50 },
        { width: 360, height: 640 },
      ),
    ).toEqual({ x: 284, y: FAB_EDGE_MARGIN });

    expect(
      snapFabPosition(
        { x: 150, y: 420 },
        { width: 420, height: 780 },
      ),
    ).toEqual({ x: FAB_EDGE_MARGIN, y: 420 });
  });

  it('calls onPress once on tap and keeps the FAB at its original position', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(<FAB onPress={onPress} />);

    const container = getByTestId('fab-container');
    const before = readAnimatedValues(container);

    fireEvent.press(getByTestId('fab-button'));

    const after = readAnimatedValues(container);

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(after).toEqual(before);
    expect(after.opacity).toBe(FAB_IDLE_OPACITY);
  });

  it('drags beyond the threshold without pressing and snaps to the nearest edge', () => {
    const onPress = jest.fn();
    const snapSpy = jest.spyOn(fabPosition, 'snapFabPosition');
    const { getByTestId, rerender } = render(<FAB onPress={onPress} />);

    const container = getByTestId('fab-container');

    const startEvent = createTouchEvent({
      previousPageX: 284,
      previousPageY: 504,
      currentPageX: 284,
      currentPageY: 504,
      previousTimeStamp: 1,
      currentTimeStamp: 1,
    });
    const thresholdEvent = createTouchEvent({
      previousPageX: 284,
      previousPageY: 504,
      currentPageX: 275,
      currentPageY: 495,
      previousTimeStamp: 1,
      currentTimeStamp: 2,
    });
    const dragEvent = createTouchEvent({
      previousPageX: 275,
      previousPageY: 495,
      currentPageX: 134,
      currentPageY: 4,
      previousTimeStamp: 2,
      currentTimeStamp: 3,
    });

    act(() => {
      container.props.onStartShouldSetResponderCapture(startEvent);
      container.props.onMoveShouldSetResponderCapture(thresholdEvent);
    });

    expect(container.props.onMoveShouldSetResponder(thresholdEvent)).toBe(true);

    act(() => {
      container.props.onResponderGrant(startEvent);
      container.props.onResponderMove(dragEvent);
      jest.runAllTimers();
    });

    const dragged = readAnimatedValues(container);

    expect(dragged.x).toBeLessThan(284);
    expect(dragged.y).toBe(FAB_EDGE_MARGIN);
    expect(dragged.opacity).toBe(FAB_DRAG_ACTIVE_OPACITY);

    act(() => {
      container.props.onResponderRelease(dragEvent);
      jest.runAllTimers();
    });

    const snapped = readAnimatedValues(container);
    const bounds = getFabBounds({ width: SCREEN.width, height: SCREEN.height });

    expect(onPress).not.toHaveBeenCalled();
    expect(snapSpy).toHaveBeenCalled();
    expect(snapped.x).toBe(bounds.minX);
    expect(snapped.y).toBe(FAB_EDGE_MARGIN);
    expect(snapped.opacity).toBe(FAB_IDLE_OPACITY);

    rerender(<FAB onPress={onPress} />);

    expect(readAnimatedValues(getByTestId('fab-container'))).toEqual(snapped);
  });
});

function readAnimatedValues(container: { props: { style: unknown } }) {
  const styles = Array.isArray(container.props.style)
    ? container.props.style
    : [container.props.style];
  const animatedStyle = styles.find(
    (style): style is { left: number | { __getValue?: () => number }; opacity: number | { __getValue?: () => number }; top: number | { __getValue?: () => number } } =>
      Boolean(style) && typeof style === 'object' && 'left' in style && 'top' in style && 'opacity' in style,
  );

  if (!animatedStyle) {
    throw new Error('Animated FAB style not found');
  }

  return {
    x: getAnimatedValue(animatedStyle.left),
    y: getAnimatedValue(animatedStyle.top),
    opacity: getAnimatedValue(animatedStyle.opacity),
  };
}

function getAnimatedValue(value: number | { __getValue?: () => number }) {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value.__getValue === 'function') {
    return value.__getValue();
  }

  throw new Error('Animated value is not readable in test');
}

function createTouchEvent({
  previousPageX,
  previousPageY,
  currentPageX,
  currentPageY,
  previousTimeStamp,
  currentTimeStamp,
}: {
  previousPageX: number;
  previousPageY: number;
  currentPageX: number;
  currentPageY: number;
  previousTimeStamp: number;
  currentTimeStamp: number;
}) {
  return {
    nativeEvent: {
      touches: [{}],
    },
    touchHistory: {
      indexOfSingleActiveTouch: 0,
      mostRecentTimeStamp: currentTimeStamp,
      numberActiveTouches: 1,
      touchBank: [
        {
          currentPageX,
          currentPageY,
          currentTimeStamp,
          previousPageX,
          previousPageY,
          previousTimeStamp,
          touchActive: true,
        },
      ],
    },
  };
}
