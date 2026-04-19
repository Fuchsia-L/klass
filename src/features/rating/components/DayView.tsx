import React, { useEffect, useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { isSameDay } from '../../../shared/lib/date';
import {
  getCategoryColor,
  MatrixEventBlock,
  MATRIX_HOUR_HEIGHT,
  ScheduleEvent,
} from '../../schedule';
import { expandRepeatingEvents } from '../../schedule/domain/repeat';
import type { TimeSlotRating } from '../types';
import { StarRating } from './StarRating';

interface DayViewProps {
  events: ScheduleEvent[];
  ratings: TimeSlotRating[];
  date: Date;
  onDateChange: (nextDate: Date) => void;
  onPressEvent: (event: ScheduleEvent) => void;
  onPressRating: (rating: TimeSlotRating) => void;
  now?: Date;
  testID?: string;
}

const HOUR_START = 6;
const HOUR_END = 24;
const TIME_COL_WIDTH = 36;
const EVENT_COL_PERCENT = '42%';
const RATING_COL_PERCENT = '58%';
const WEEKDAY_ZH = ['日', '一', '二', '三', '四', '五', '六'];

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getHours(date: Date): number {
  return date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
}

function getPosition(startIso: string, endIso: string, dayStart: Date) {
  const dayEnd = addDays(dayStart, 1);
  const start = new Date(startIso);
  const end = new Date(endIso);
  const intersectionStart = new Date(Math.max(start.getTime(), dayStart.getTime()));
  const intersectionEnd = new Date(Math.min(end.getTime(), dayEnd.getTime()));

  if (intersectionEnd.getTime() <= intersectionStart.getTime()) {
    return null;
  }

  const clampedStartHour = Math.min(Math.max(getHours(intersectionStart), HOUR_START), HOUR_END);
  const clampedEndHour = Math.min(Math.max(getHours(intersectionEnd), HOUR_START), HOUR_END);

  if (clampedEndHour <= clampedStartHour) {
    return null;
  }

  return {
    top: (clampedStartHour - HOUR_START) * MATRIX_HOUR_HEIGHT,
    height: Math.max((clampedEndHour - clampedStartHour) * MATRIX_HOUR_HEIGHT, 16),
  };
}

export function DayView({
  events,
  ratings,
  date,
  onDateChange,
  onPressEvent,
  onPressRating,
  now = new Date(),
  testID = 'day-view',
}: DayViewProps) {
  const theme = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const dayStart = useMemo(() => startOfDay(date), [date]);
  const dayEnd = useMemo(() => addDays(dayStart, 1), [dayStart]);
  const hours = useMemo(() => Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i), []);
  const gridHeight = hours.length * MATRIX_HOUR_HEIGHT;

  const dayEvents = useMemo(
    () => expandRepeatingEvents(events, dayStart, dayEnd),
    [events, dayEnd, dayStart],
  );

  const dayRatings = useMemo(
    () =>
      ratings.filter((rating) =>
        getPosition(rating.slot_start, rating.slot_end, dayStart),
      ),
    [dayStart, ratings],
  );

  const eventById = useMemo(() => {
    const map = new Map<string, ScheduleEvent>();
    for (const e of dayEvents) map.set(e.id, e);
    return map;
  }, [dayEvents]);

  const currentTimeOffset = useMemo(() => {
    const hoursFromStart = getHours(now) - HOUR_START;
    return hoursFromStart * MATRIX_HOUR_HEIGHT;
  }, [now]);

  useEffect(() => {
    const scrollTo = isSameDay(dayStart, now) ? Math.max(0, currentTimeOffset - 100) : 0;
    const timeout = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: scrollTo, animated: false });
    }, 100);

    return () => clearTimeout(timeout);
  }, [currentTimeOffset, dayStart, now]);

  const goToDay = (offset: number) => {
    onDateChange(addDays(dayStart, offset));
  };

  return (
    <View style={styles.container} testID={testID}>
      <View style={[styles.header, { borderBottomColor: theme.colors.divider }]}>
        <TouchableOpacity
          onPress={() => goToDay(-1)}
          style={styles.navButton}
          testID={`${testID}-prev-day`}
        >
          <ChevronLeft size={20} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text
          style={[styles.headerLabel, { color: theme.colors.textMain, fontFamily: theme.fonts.heading }]}
          testID={`${testID}-header-label`}
        >
          {dayStart.getMonth() + 1}月{dayStart.getDate()}日 周{WEEKDAY_ZH[dayStart.getDay()]}
        </Text>
        <TouchableOpacity
          onPress={() => goToDay(1)}
          style={styles.navButton}
          testID={`${testID}-next-day`}
        >
          <ChevronRight size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView ref={scrollRef} style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.grid, { height: gridHeight }]}>
          {hours.map((hour) => (
            <View
              key={hour}
              style={[
                styles.hourRow,
                {
                  top: (hour - HOUR_START) * MATRIX_HOUR_HEIGHT,
                  borderBottomColor: theme.colors.divider,
                },
              ]}
            >
              <Text style={[styles.hourLabel, { color: theme.colors.textSub }]}>{hour.toString().padStart(2, '0')}</Text>
            </View>
          ))}

          <View style={[styles.columns, { left: TIME_COL_WIDTH }]}>
            <View style={[styles.eventColumn, { borderLeftColor: theme.colors.divider }]}>
              {dayEvents.map((event, index) => {
                const position = getPosition(event.start_time, event.end_time, dayStart);
                if (!position) return null;
                const categoryColor = getCategoryColor(theme, event.category);

                return (
                  <MatrixEventBlock
                    key={`${event.id}-${event.start_time}-${index}`}
                    event={event}
                    height={position.height}
                    style={[
                      styles.block,
                      {
                        top: position.top,
                        left: 1,
                        width: '98%',
                        height: position.height,
                        backgroundColor: `${categoryColor}30`,
                        borderLeftColor: categoryColor,
                      },
                    ]}
                    onPress={() => onPressEvent(event)}
                    titleColor={theme.colors.textMain}
                    locationColor={theme.colors.textSub}
                    testID={`${testID}-event-${event.id}-${index}`}
                  />
                );
              })}
            </View>
            <View style={[styles.ratingColumn, { borderLeftColor: theme.colors.divider }]}>
              {dayRatings.map((rating) => {
                const position = getPosition(rating.slot_start, rating.slot_end, dayStart);
                if (!position) return null;

                const linkedEvent = rating.linked_event_id
                  ? eventById.get(rating.linked_event_id)
                  : undefined;
                const activityText = rating.activity?.trim() ?? '';
                const activityRedundant =
                  linkedEvent != null && activityText === linkedEvent.title.trim();
                const showActivity = activityText.length > 0 && !activityRedundant;

                return (
                  <TouchableOpacity
                    key={rating.id}
                    onPress={() => onPressRating(rating)}
                    activeOpacity={0.75}
                    testID={`${testID}-rating-${rating.id}`}
                    style={[
                      styles.ratingBlock,
                      {
                        top: position.top,
                        height: position.height,
                        backgroundColor: theme.colors.card,
                        borderColor: theme.colors.cardBorder,
                        borderLeftColor: theme.colors.primary,
                        borderRadius: 4,
                      },
                    ]}
                  >
                    {showActivity ? (
                      <Text style={[styles.activity, { color: theme.colors.textMain }]} numberOfLines={2}>
                        {activityText}
                      </Text>
                    ) : null}
                    <View style={[styles.ratingMeta, showActivity && styles.ratingMetaBelow]}>
                      <StarRating value={rating.rating} disabled size={12} testID={`${testID}-rating-${rating.id}-stars`} />
                      <Text style={[styles.efficiency, { color: theme.colors.success, fontFamily: theme.fonts.heading }]}>
                        EFF {rating.efficiency}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {isSameDay(dayStart, now) && currentTimeOffset >= 0 && currentTimeOffset <= gridHeight ? (
            <View
              style={[
                styles.currentTimeLine,
                {
                  top: currentTimeOffset,
                  left: TIME_COL_WIDTH,
                  backgroundColor: theme.colors.accent,
                },
              ]}
            />
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  navButton: {
    padding: 6,
  },
  headerLabel: {
    fontSize: 14,
  },
  scroll: {
    flex: 1,
  },
  grid: {
    position: 'relative',
  },
  hourRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: MATRIX_HOUR_HEIGHT,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  hourLabel: {
    width: TIME_COL_WIDTH,
    fontSize: 10,
    textAlign: 'center',
    marginTop: -6,
  },
  columns: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  eventColumn: {
    width: EVENT_COL_PERCENT,
    height: '100%',
    position: 'relative',
    borderLeftWidth: StyleSheet.hairlineWidth,
  },
  ratingColumn: {
    width: RATING_COL_PERCENT,
    height: '100%',
    position: 'relative',
    borderLeftWidth: StyleSheet.hairlineWidth,
  },
  block: {
    position: 'absolute',
    borderLeftWidth: 3,
    borderRadius: 4,
    paddingHorizontal: 3,
    paddingVertical: 1,
    overflow: 'hidden',
  },
  ratingBlock: {
    position: 'absolute',
    left: 2,
    width: '96%',
    borderWidth: 1,
    borderLeftWidth: 3,
    padding: 4,
    overflow: 'hidden',
  },
  ratingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  ratingMetaBelow: {
    marginTop: 3,
  },
  efficiency: {
    fontSize: 10,
  },
  activity: {
    fontSize: 11,
    lineHeight: 14,
  },
  currentTimeLine: {
    position: 'absolute',
    right: 0,
    height: 2,
    zIndex: 10,
  },
});
