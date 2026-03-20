import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { MatrixEventBlock, getMatrixEventContentLayout } from './MatrixEventBlock';
import type { ScheduleEvent } from '../types';

const baseEvent: ScheduleEvent = {
  id: 'evt-1',
  title:
    'Advanced Distributed Systems Seminar With Extended Planning Notes For Matrix Threshold Rendering',
  category: '学习',
  start_time: '2026-02-23T09:00:00.000Z',
  end_time: '2026-02-23T10:00:00.000Z',
  repeat: 'none',
  location: 'Engineering Building Room 502',
  is_completed: false,
};

describe('getMatrixEventContentLayout', () => {
  it('maps representative heights to compact, standard, and expanded rules', () => {
    expect(getMatrixEventContentLayout({ height: 30, hasLocation: true })).toMatchObject({
      mode: 'compact',
      titleFontSize: 9,
      titleNumberOfLines: 1,
      showLocation: false,
    });

    expect(getMatrixEventContentLayout({ height: 60, hasLocation: true })).toMatchObject({
      mode: 'standard',
      titleFontSize: 10,
      titleNumberOfLines: 2,
      showLocation: false,
    });

    expect(
      getMatrixEventContentLayout({
        height: 90,
        hasLocation: true,
        titleLineCount: 2,
      }),
    ).toMatchObject({
      mode: 'expanded',
      titleFontSize: 10,
      showLocation: true,
    });
  });
});

describe('MatrixEventBlock', () => {
  it('renders single-line, two-line, and expanded variants at the required thresholds', () => {
    const compact = render(
      <MatrixEventBlock
        event={baseEvent}
        height={30}
        style={{ position: 'absolute', top: 10, left: 20, width: 80, height: 30, overflow: 'hidden' }}
        onPress={() => {}}
        titleColor="#F8FAFC"
        locationColor="#94A3B8"
        testID="compact"
      />,
    );
    const compactTitle = compact.getByTestId('compact-title');

    expect(compactTitle.props.numberOfLines).toBe(1);
    expect(compactTitle.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ fontSize: 9 })]),
    );
    expect(compact.queryByTestId('compact-location')).toBeNull();

    const standard = render(
      <MatrixEventBlock
        event={baseEvent}
        height={60}
        style={{ position: 'absolute', top: 10, left: 20, width: 80, height: 60, overflow: 'hidden' }}
        onPress={() => {}}
        titleColor="#F8FAFC"
        locationColor="#94A3B8"
        testID="standard"
      />,
    );
    const standardTitle = standard.getByTestId('standard-title');

    expect(standardTitle.props.numberOfLines).toBe(2);
    expect(standardTitle.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ fontSize: 10 })]),
    );
    expect(standard.queryByTestId('standard-location')).toBeNull();

    const expanded = render(
      <MatrixEventBlock
        event={baseEvent}
        height={90}
        style={{ position: 'absolute', top: 10, left: 20, width: 80, height: 90, overflow: 'hidden' }}
        onPress={() => {}}
        titleColor="#F8FAFC"
        locationColor="#94A3B8"
        testID="expanded"
      />,
    );
    const expandedTitle = expanded.getByTestId('expanded-title');

    expect(expandedTitle.props.numberOfLines).toBeGreaterThan(2);

    fireEvent(expandedTitle, 'textLayout', {
      nativeEvent: {
        lines: [{ text: 'one' }, { text: 'two' }],
      },
    });

    const expandedLocation = expanded.getByTestId('expanded-location');
    expect(expandedLocation.props.children).toBe(baseEvent.location);
    expect(expandedLocation.props.numberOfLines).toBe(1);
  });

  it('keeps block bounds stable for short and long content while preserving tap behavior', () => {
    const onPress = jest.fn();
    const style = {
      position: 'absolute' as const,
      top: 120,
      left: 64,
      width: 72,
      height: 90,
      overflow: 'hidden' as const,
    };

    const { getByTestId, queryByTestId } = render(
      <MatrixEventBlock
        event={baseEvent}
        height={90}
        style={style}
        onPress={onPress}
        titleColor="#F8FAFC"
        locationColor="#94A3B8"
        testID="stable"
      />,
    );

    const block = getByTestId('stable');
    const title = getByTestId('stable-title');

    fireEvent(title, 'textLayout', {
      nativeEvent: {
        lines: new Array(7).fill(null).map((_, index) => ({ text: `line-${index}` })),
      },
    });

    expect(block.props.style).toMatchObject(style);
    expect(queryByTestId('stable-location')).toBeNull();

    fireEvent.press(block);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
