import React, { useMemo, useState } from 'react';
import {
  NativeSyntheticEvent,
  StyleProp,
  StyleSheet,
  Text,
  TextLayoutEventData,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import type { ScheduleEvent } from '../types';

export const MATRIX_HOUR_HEIGHT = 60;
export const MATRIX_EVENT_COMPACT_MAX_HEIGHT = Math.round((MATRIX_HOUR_HEIGHT * 2) / 3);
export const MATRIX_EVENT_STANDARD_MAX_HEIGHT = Math.round((MATRIX_HOUR_HEIGHT * 4) / 3);

const CONTENT_PADDING_VERTICAL = 2;
const COMPACT_TITLE_FONT_SIZE = 9;
const COMPACT_TITLE_LINE_HEIGHT = 11;
const DEFAULT_TITLE_FONT_SIZE = 10;
const DEFAULT_TITLE_LINE_HEIGHT = 12;
const LOCATION_FONT_SIZE = 9;
const LOCATION_LINE_HEIGHT = 11;
const LOCATION_MARGIN_TOP = 1;

export interface MatrixEventContentLayout {
  mode: 'compact' | 'standard' | 'expanded';
  titleFontSize: number;
  titleLineHeight: number;
  titleNumberOfLines: number;
  showLocation: boolean;
  locationFontSize?: number;
  locationLineHeight?: number;
}

export function getMatrixEventContentLayout({
  height,
  hasLocation,
  titleLineCount,
}: {
  height: number;
  hasLocation: boolean;
  titleLineCount?: number;
}): MatrixEventContentLayout {
  if (height < MATRIX_EVENT_COMPACT_MAX_HEIGHT) {
    return {
      mode: 'compact',
      titleFontSize: COMPACT_TITLE_FONT_SIZE,
      titleLineHeight: COMPACT_TITLE_LINE_HEIGHT,
      titleNumberOfLines: 1,
      showLocation: false,
    };
  }

  if (height <= MATRIX_EVENT_STANDARD_MAX_HEIGHT) {
    return {
      mode: 'standard',
      titleFontSize: DEFAULT_TITLE_FONT_SIZE,
      titleLineHeight: DEFAULT_TITLE_LINE_HEIGHT,
      titleNumberOfLines: 2,
      showLocation: false,
    };
  }

  const availableHeight = Math.max(height - CONTENT_PADDING_VERTICAL * 2, DEFAULT_TITLE_LINE_HEIGHT);
  const titleNumberOfLines = Math.max(1, Math.floor(availableHeight / DEFAULT_TITLE_LINE_HEIGHT));
  const renderedTitleLines = Math.min(titleLineCount ?? titleNumberOfLines, titleNumberOfLines);
  const remainingHeight = availableHeight - renderedTitleLines * DEFAULT_TITLE_LINE_HEIGHT;
  const showLocation = hasLocation && remainingHeight >= LOCATION_LINE_HEIGHT + LOCATION_MARGIN_TOP;

  return {
    mode: 'expanded',
    titleFontSize: DEFAULT_TITLE_FONT_SIZE,
    titleLineHeight: DEFAULT_TITLE_LINE_HEIGHT,
    titleNumberOfLines,
    showLocation,
    locationFontSize: LOCATION_FONT_SIZE,
    locationLineHeight: LOCATION_LINE_HEIGHT,
  };
}

interface MatrixEventBlockProps {
  event: ScheduleEvent;
  height: number;
  style: StyleProp<ViewStyle>;
  onPress: () => void;
  titleColor: string;
  locationColor: string;
  testID?: string;
}

export function MatrixEventBlock({
  event,
  height,
  style,
  onPress,
  titleColor,
  locationColor,
  testID = 'matrix-event-block',
}: MatrixEventBlockProps) {
  const [titleLineCount, setTitleLineCount] = useState<number>();

  const layout = useMemo(
    () =>
      getMatrixEventContentLayout({
        height,
        hasLocation: Boolean(event.location),
        titleLineCount,
      }),
    [event.location, height, titleLineCount],
  );

  const handleTitleLayout = (eventData: NativeSyntheticEvent<TextLayoutEventData>) => {
    if (layout.mode !== 'expanded') {
      return;
    }

    const nextLineCount = eventData.nativeEvent.lines.length;
    setTitleLineCount((currentLineCount) =>
      currentLineCount === nextLineCount ? currentLineCount : nextLineCount,
    );
  };

  return (
    <TouchableOpacity testID={testID} style={style} activeOpacity={0.7} onPress={onPress}>
      <View pointerEvents="none">
        <Text
          testID={`${testID}-title`}
          style={[
            styles.title,
            {
              color: titleColor,
              fontSize: layout.titleFontSize,
              lineHeight: layout.titleLineHeight,
            },
          ]}
          numberOfLines={layout.titleNumberOfLines}
          ellipsizeMode="tail"
          onTextLayout={handleTitleLayout}
        >
          {event.title}
        </Text>
        {layout.showLocation && event.location ? (
          <Text
            testID={`${testID}-location`}
            style={[
              styles.location,
              {
                color: locationColor,
                fontSize: layout.locationFontSize,
                lineHeight: layout.locationLineHeight,
              },
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {event.location}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

export const matrixEventBlockContentPaddingVertical = CONTENT_PADDING_VERTICAL;

const styles = StyleSheet.create({
  title: {
    fontWeight: '600',
    flexShrink: 1,
  },
  location: {
    marginTop: LOCATION_MARGIN_TOP,
    fontWeight: '400',
    opacity: 0.8,
  },
});
