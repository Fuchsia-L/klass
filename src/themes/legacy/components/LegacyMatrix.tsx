import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { AppBar } from '../../../shared/components/AppBar';
import { FAB } from '../../../shared/components/FAB';
import {
  EventSheet,
  getCategoryColor,
  MatrixEventBlock,
  MATRIX_HOUR_HEIGHT,
  ScheduleEvent,
  useEvents,
  useSemesterConfig,
} from '../../../features/schedule';
import {
  getWeekStart,
  getISOWeekNumber,
  WEEKDAY_LABELS,
  getSemesterWeek,
} from '../../../features/schedule/domain/calendar';
import { expandRepeatingEvents } from '../../../features/schedule/domain/repeat';
import { isSameDay } from '../../../shared/lib/date';

const HOUR_START = 6;
const HOUR_END = 24;
const HOUR_HEIGHT = MATRIX_HOUR_HEIGHT;
const TIME_COL_WIDTH = 36;

export function LegacyMatrix() {
  const theme = useTheme();
  const { events } = useEvents();
  const { semester } = useSemesterConfig();
  const scrollRef = useRef<ScrollView>(null);
  const { width: screenWidth } = useWindowDimensions();
  const dayColWidth = Math.max((screenWidth - TIME_COL_WIDTH) / 7, 1);

  const [weekOffset, setWeekOffset] = useState(0);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetMode, setSheetMode] = useState<'view' | 'create' | 'edit'>('create');
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);
  const [defaultStart, setDefaultStart] = useState<Date | undefined>();
  const [defaultEnd, setDefaultEnd] = useState<Date | undefined>();
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const now = new Date();
  const baseWeekStart = getWeekStart(now);
  const weekStart = useMemo(() => {
    const d = new Date(baseWeekStart);
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  }, [weekOffset, baseWeekStart.getTime()]);

  const weekEnd = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    return d;
  }, [weekStart]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const weekEvents = useMemo(() => {
    return expandRepeatingEvents(events, weekStart, weekEnd);
  }, [events, weekStart, weekEnd]);

  const isoWeek = getISOWeekNumber(weekStart);
  const semesterWeek = semester ? getSemesterWeek(semester.start_date, weekStart) : null;

  // Current time line position
  const currentTimeOffset = useMemo(() => {
    const hours = now.getHours() + now.getMinutes() / 60;
    return (hours - HOUR_START) * HOUR_HEIGHT;
  }, [now]);

  const isCurrentWeek = weekOffset === 0;
  const currentDayIdx = isCurrentWeek ? (now.getDay() === 0 ? 6 : now.getDay() - 1) : -1;

  // Scroll to current time on mount
  useEffect(() => {
    scrollTimeoutRef.current = setTimeout(() => {
      const scrollTo = Math.max(0, currentTimeOffset - 100);
      scrollRef.current?.scrollTo({ y: scrollTo, animated: false });
    }, 100);

    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
    };
  }, []);

  const getEventStyle = (event: ScheduleEvent, dayIdx: number) => {
    const start = new Date(event.start_time);
    const end = new Date(event.end_time);
    const startHour = start.getHours() + start.getMinutes() / 60;
    const endHour = end.getHours() + end.getMinutes() / 60;
    const top = (startHour - HOUR_START) * HOUR_HEIGHT;
    const height = Math.max((endHour - startHour) * HOUR_HEIGHT, 16);
    const categoryColor = getCategoryColor(theme, event.category);

    return {
      position: 'absolute' as const,
      left: TIME_COL_WIDTH + dayIdx * dayColWidth + 1,
      top,
      width: dayColWidth - 2,
      height,
      backgroundColor: `${categoryColor}30`,
      borderLeftWidth: 3,
      borderLeftColor: categoryColor,
      borderRadius: 4,
      paddingHorizontal: 3,
      paddingVertical: 1,
      overflow: 'hidden' as const,
    };
  };

  const handleTapEmpty = (dayIdx: number, hour: number) => {
    const d = new Date(weekDays[dayIdx]);
    d.setHours(hour, 0, 0, 0);
    const end = new Date(d);
    end.setHours(hour + 1);
    setDefaultStart(d);
    setDefaultEnd(end);
    setSelectedEvent(null);
    setSheetMode('create');
    setSheetVisible(true);
  };

  const handleTapEvent = (ev: ScheduleEvent) => {
    setSelectedEvent(ev);
    setSheetMode('view');
    setSheetVisible(true);
  };

  const openCreate = () => {
    setDefaultStart(undefined);
    setDefaultEnd(undefined);
    setSelectedEvent(null);
    setSheetMode('create');
    setSheetVisible(true);
  };

  const hours = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);
  const gridHeight = hours.length * HOUR_HEIGHT;

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <AppBar
        title="MATRIX"
        subtitle={
          semesterWeek && semesterWeek <= (semester?.total_weeks ?? 0)
            ? `第${semesterWeek}周 / W${isoWeek}`
            : `W${isoWeek}`
        }
        right={
          <View style={styles.weekNav}>
            <TouchableOpacity onPress={() => setWeekOffset((o) => o - 1)} style={styles.navBtn}>
              <ChevronLeft size={20} color={theme.colors.primary} />
            </TouchableOpacity>
            {weekOffset !== 0 ? (
              <TouchableOpacity onPress={() => setWeekOffset(0)} style={styles.todayBtn}>
                <Text style={[styles.todayText, { color: theme.colors.primary }]}>今</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity onPress={() => setWeekOffset((o) => o + 1)} style={styles.navBtn}>
              <ChevronRight size={20} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
        }
      />

      {/* Day headers */}
      <View style={[styles.dayHeaderRow, { borderBottomColor: theme.colors.divider }]}>
        <View style={[styles.timeCol, { width: TIME_COL_WIDTH }]} />
        {weekDays.map((d, i) => {
          const isToday = isSameDay(d, now);
          return (
            <View key={i} style={[styles.dayHeaderCell, { width: dayColWidth }]}>
              <Text
                style={[
                  styles.dayLabel,
                  { color: isToday ? theme.colors.primary : theme.colors.textSub },
                ]}
              >
                {WEEKDAY_LABELS[i]}
              </Text>
              <Text
                style={[
                  styles.dayDate,
                  {
                    color: isToday ? theme.colors.primary : theme.colors.textMain,
                    fontWeight: isToday ? '700' : '400',
                  },
                ]}
              >
                {d.getDate()}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Scrollable grid */}
      <ScrollView ref={scrollRef} style={styles.flex} showsVerticalScrollIndicator={false}>
        <View style={{ height: gridHeight, position: 'relative' }}>
          {/* Hour lines */}
          {hours.map((h) => (
            <View
              key={h}
              style={[
                styles.hourRow,
                { top: (h - HOUR_START) * HOUR_HEIGHT, borderBottomColor: theme.colors.divider },
              ]}
            >
              <Text style={[styles.hourLabel, { color: theme.colors.textSub, width: TIME_COL_WIDTH }]}>
                {h.toString().padStart(2, '0')}
              </Text>
            </View>
          ))}

          {/* Column dividers */}
          {weekDays.map((_, i) => (
            <View
              key={i}
              style={[
                styles.colDivider,
                {
                  left: TIME_COL_WIDTH + i * dayColWidth,
                  height: gridHeight,
                  borderLeftColor: theme.colors.divider,
                },
              ]}
            />
          ))}

          {/* Tap targets for empty areas */}
          {weekDays.map((_, dayIdx) =>
            hours.map((h) => (
              <TouchableOpacity
                key={`tap-${dayIdx}-${h}`}
                style={{
                  position: 'absolute',
                  left: TIME_COL_WIDTH + dayIdx * dayColWidth,
                  top: (h - HOUR_START) * HOUR_HEIGHT,
                  width: dayColWidth,
                  height: HOUR_HEIGHT,
                }}
                activeOpacity={1}
                onPress={() => handleTapEmpty(dayIdx, h)}
              />
            )),
          )}

          {/* Event blocks */}
          {weekEvents.map((ev, idx) => {
            const evStart = new Date(ev.start_time);
            const dayIdx = weekDays.findIndex((d) => isSameDay(d, evStart));
            if (dayIdx === -1) return null;
            const eventStyle = getEventStyle(ev, dayIdx);

            return (
              <MatrixEventBlock
                key={ev.id + '-' + idx}
                style={eventStyle}
                height={eventStyle.height}
                onPress={() => handleTapEvent(ev)}
                event={ev}
                titleColor={theme.colors.textMain}
                locationColor={theme.colors.textSub}
                testID={`matrix-event-${ev.id}-${idx}`}
              />
            );
          })}

          {/* Current time line */}
          {isCurrentWeek && currentTimeOffset >= 0 && currentTimeOffset <= gridHeight ? (
            <View
              style={[
                styles.currentTimeLine,
                {
                  top: currentTimeOffset,
                  left: TIME_COL_WIDTH + (currentDayIdx >= 0 ? 0 : 0),
                  right: 0,
                  backgroundColor: theme.colors.accent,
                },
              ]}
            >
              <View style={[styles.currentTimeDot, { backgroundColor: theme.colors.accent }]} />
            </View>
          ) : null}
        </View>
      </ScrollView>

      <FAB onPress={openCreate} />

      <EventSheet
        visible={sheetVisible}
        mode={sheetMode}
        event={selectedEvent}
        defaultStart={defaultStart}
        defaultEnd={defaultEnd}
        onClose={() => setSheetVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  navBtn: { padding: 4 },
  todayBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  todayText: {
    fontSize: 14,
    fontWeight: '700',
  },
  dayHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingVertical: 6,
  },
  timeCol: {},
  dayHeaderCell: {
    alignItems: 'center',
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  dayDate: {
    fontSize: 16,
    marginTop: 2,
  },
  hourRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: HOUR_HEIGHT,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
  },
  hourLabel: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: -6,
  },
  colDivider: {
    position: 'absolute',
    top: 0,
    borderLeftWidth: StyleSheet.hairlineWidth,
  },
  currentTimeLine: {
    position: 'absolute',
    height: 2,
    zIndex: 10,
  },
  currentTimeDot: {
    position: 'absolute',
    left: -4,
    top: -3,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
