import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { formatLocalDate, formatTime } from '../../../shared/lib/date';
import DateTimePicker from '../../schedule/components/DateTimePicker';
import { expandRepeatingEvents } from '../../schedule/domain/repeat';
import { useEvents } from '../../schedule/hooks/useEvents';
import type { ScheduleEvent } from '../../schedule/types';
import type { RatingInput } from '../services';
import type { RatingValue, TimeSlotRating } from '../types';
import { EfficiencySlider } from './EfficiencySlider';
import { EventPicker } from './EventPicker';
import { StarRating } from './StarRating';

interface RatingInputSheetProps {
  visible: boolean;
  rating?: TimeSlotRating | null;
  defaultStart?: Date;
  defaultEnd?: Date;
  now?: Date;
  defaultEvent?: ScheduleEvent;
  onSave: (input: RatingInput, id?: string) => Promise<void> | void;
  onClose: () => void;
}

const DEFAULT_RATING: RatingValue = 3;
const DEFAULT_EFFICIENCY: RatingValue = 3;
const THIRTY_MINUTES_MS = 30 * 60 * 1000;

type SlotMode = 'event' | 'custom';

function getDefaultSlot(): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date(end.getTime() - 60 * 60 * 1000);
  return { start, end };
}

function formatDateTime(date: Date): string {
  return `${formatLocalDate(date)} ${formatTime(date)}`;
}

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

function findJustFinishedEvent(events: ScheduleEvent[], now: Date): ScheduleEvent | undefined {
  return events
    .filter((event) => new Date(event.end_time).getTime() < now.getTime())
    .sort((a, b) => new Date(b.end_time).getTime() - new Date(a.end_time).getTime())[0];
}

function getEventOptions(events: ScheduleEvent[], evaluateNow: Date): ScheduleEvent[] {
  const todayStart = startOfDay(evaluateNow);
  const windowStart = addDays(todayStart, -2);
  const windowEnd = addDays(todayStart, 1);

  return expandRepeatingEvents(events, windowStart, windowEnd).sort(
    (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime(),
  );
}

export function RatingInputSheet({
  visible,
  rating,
  defaultStart,
  defaultEnd,
  now,
  defaultEvent,
  onSave,
  onClose,
}: RatingInputSheetProps) {
  const theme = useTheme();
  const { events } = useEvents();
  const eventsRef = useRef(events);
  const nowRef = useRef(now);
  eventsRef.current = events;
  nowRef.current = now;
  const fallbackSlot = useMemo(getDefaultSlot, [visible]);
  const eventOptions = useMemo(() => {
    return getEventOptions(events, now ?? new Date());
  }, [events, now, visible]);
  const [slotStart, setSlotStart] = useState(defaultStart ?? fallbackSlot.start);
  const [slotEnd, setSlotEnd] = useState(defaultEnd ?? fallbackSlot.end);
  const [mode, setMode] = useState<SlotMode>('custom');
  const [selectedEventId, setSelectedEventId] = useState<string>();
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent>();
  const [ratingValue, setRatingValue] = useState<RatingValue>(DEFAULT_RATING);
  const [efficiency, setEfficiency] = useState<RatingValue>(DEFAULT_EFFICIENCY);
  const [activity, setActivity] = useState('');
  const [mood, setMood] = useState('');
  const [reflection, setReflection] = useState('');
  const [pickerActive, setPickerActive] = useState(false);
  const [error, setError] = useState('');

  const selectEvent = (event: ScheduleEvent, prefillActivity = true) => {
    setSelectedEventId(event.id);
    setSelectedEvent(event);
    setSlotStart(new Date(event.start_time));
    setSlotEnd(new Date(event.end_time));
    if (prefillActivity) {
      setActivity(event.title);
    }
  };

  const activateEventMode = () => {
    setMode('event');
    if (!selectedEvent) {
      const eventToSelect = findJustFinishedEvent(eventOptions, now ?? new Date());
      if (eventToSelect) {
        selectEvent(eventToSelect);
      }
    }
  };

  useEffect(() => {
    if (!visible) return;

    const evaluateNow = nowRef.current ?? new Date();
    const nextFallback = getDefaultSlot();
    const resetEventOptions = getEventOptions(eventsRef.current, evaluateNow);
    const linkedEvent = rating?.linked_event_id
      ? resetEventOptions.find((event) => event.id === rating.linked_event_id)
      : undefined;
    const recentEvent = findJustFinishedEvent(resetEventOptions, evaluateNow);
    const recentEventEnd = recentEvent ? new Date(recentEvent.end_time).getTime() : 0;
    const eventToSelect = rating
      ? linkedEvent
      : defaultEvent ?? (
          recentEvent && evaluateNow.getTime() - THIRTY_MINUTES_MS <= recentEventEnd
            ? recentEvent
            : undefined
        );

    setMode(eventToSelect ? 'event' : 'custom');
    setSelectedEventId(eventToSelect?.id);
    setSelectedEvent(eventToSelect);
    setSlotStart(eventToSelect ? new Date(eventToSelect.start_time) : rating ? new Date(rating.slot_start) : defaultStart ?? nextFallback.start);
    setSlotEnd(eventToSelect ? new Date(eventToSelect.end_time) : rating ? new Date(rating.slot_end) : defaultEnd ?? nextFallback.end);
    setRatingValue(rating?.rating ?? DEFAULT_RATING);
    setEfficiency(rating?.efficiency ?? DEFAULT_EFFICIENCY);
    setActivity(rating?.activity ?? eventToSelect?.title ?? '');
    setMood(rating?.mood ?? '');
    setReflection(rating?.reflection ?? '');
    setPickerActive(false);
    setError('');
  }, [defaultEnd, defaultEvent, defaultStart, rating, visible]);

  const handleSave = async () => {
    if (mode === 'event' && !selectedEvent) {
      setError('请先选择事件');
      return;
    }

    if (slotEnd.getTime() <= slotStart.getTime()) {
      setError('结束时间必须晚于开始时间');
      return;
    }

    await onSave(
      {
        slot_start: slotStart.toISOString(),
        slot_end: slotEnd.toISOString(),
        linked_event_id: mode === 'event' ? selectedEvent?.id : undefined,
        rating: ratingValue,
        efficiency,
        activity: activity.trim() || undefined,
        mood: mood.trim() || undefined,
        reflection: reflection.trim() || undefined,
      },
      rating?.id,
    );
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[styles.overlay, { backgroundColor: theme.colors.overlay }]} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.bg,
              borderColor: theme.colors.cardBorder,
              borderTopLeftRadius: theme.radius.sheet,
              borderTopRightRadius: theme.radius.sheet,
            },
          ]}
          onPress={() => {}}
        >
          <View style={[styles.handle, { backgroundColor: theme.colors.textSub }]} />
          <View style={styles.header}>
            <View>
              <Text style={[styles.title, { color: theme.colors.primary, fontFamily: theme.fonts.heading }]}>
                时段打分
              </Text>
              <Text style={[styles.subtitle, { color: theme.colors.textSub }]}>
                {formatDateTime(slotStart)} - {formatTime(slotEnd)}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.iconButton} testID="rating-sheet-close">
              <X size={20} color={theme.colors.textSub} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false} scrollEnabled={!pickerActive}>
            <View style={styles.segmentedRow}>
              <TouchableOpacity
                onPress={activateEventMode}
                style={[
                  styles.segment,
                  {
                    borderColor: mode === 'event' ? theme.colors.primary : theme.colors.divider,
                    backgroundColor: mode === 'event' ? theme.colors.inputBg : theme.colors.bg,
                    borderRadius: theme.radius.button,
                  },
                ]}
                testID="rating-mode-event"
              >
                <Text style={[styles.segmentText, { color: mode === 'event' ? theme.colors.primary : theme.colors.textSub }]}>
                  从日程选
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setMode('custom');
                  setSelectedEventId(undefined);
                  setSelectedEvent(undefined);
                }}
                style={[
                  styles.segment,
                  {
                    borderColor: mode === 'custom' ? theme.colors.primary : theme.colors.divider,
                    backgroundColor: mode === 'custom' ? theme.colors.inputBg : theme.colors.bg,
                    borderRadius: theme.radius.button,
                  },
                ]}
                testID="rating-mode-custom"
              >
                <Text style={[styles.segmentText, { color: mode === 'custom' ? theme.colors.primary : theme.colors.textSub }]}>
                  自定义时段
                </Text>
              </TouchableOpacity>
            </View>

            {mode === 'event' ? (
              <>
                <EventPicker
                  events={eventOptions}
                  selectedEventId={selectedEventId}
                  onSelect={(event) => selectEvent(event)}
                />
                <Text style={[styles.label, { color: theme.colors.textSub }]}>已选时段</Text>
                <Text style={[styles.readOnlySlot, { color: theme.colors.textMain, borderColor: theme.colors.divider }]}>
                  {selectedEvent ? `${formatLocalDate(slotStart)} ${formatTime(slotStart)} - ${formatTime(slotEnd)}` : '未选择'}
                </Text>
              </>
            ) : (
              <>
                <Text style={[styles.label, { color: theme.colors.textSub }]}>开始时间</Text>
                <DateTimePicker
                  value={slotStart}
                  onChange={setSlotStart}
                  theme={theme}
                  minimumHour={0}
                  onPickerActive={setPickerActive}
                  testID="rating-slot-start-picker"
                />

                <Text style={[styles.label, { color: theme.colors.textSub }]}>结束时间</Text>
                <DateTimePicker
                  value={slotEnd}
                  onChange={setSlotEnd}
                  theme={theme}
                  minimumHour={0}
                  allowMidnight24
                  onPickerActive={setPickerActive}
                  testID="rating-slot-end-picker"
                />
              </>
            )}

            <Text style={[styles.label, { color: theme.colors.textSub }]}>Rating</Text>
            <StarRating value={ratingValue} onChange={setRatingValue} />

            <Text style={[styles.label, { color: theme.colors.textSub }]}>Efficiency</Text>
            <EfficiencySlider value={efficiency} onChange={setEfficiency} />

            <Text style={[styles.label, { color: theme.colors.textSub }]}>活动</Text>
            <TextInput
              value={activity}
              onChangeText={setActivity}
              placeholder="可选"
              placeholderTextColor={theme.colors.textSub}
              maxLength={50}
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.inputBg,
                  borderColor: theme.colors.divider,
                  color: theme.colors.textMain,
                  borderRadius: theme.radius.button,
                },
              ]}
            />

            <Text style={[styles.label, { color: theme.colors.textSub }]}>心情</Text>
            <TextInput
              value={mood}
              onChangeText={setMood}
              placeholder="可选"
              placeholderTextColor={theme.colors.textSub}
              maxLength={20}
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.inputBg,
                  borderColor: theme.colors.divider,
                  color: theme.colors.textMain,
                  borderRadius: theme.radius.button,
                },
              ]}
            />

            <Text style={[styles.label, { color: theme.colors.textSub }]}>反思</Text>
            <TextInput
              value={reflection}
              onChangeText={setReflection}
              placeholder="可选"
              placeholderTextColor={theme.colors.textSub}
              maxLength={200}
              multiline
              numberOfLines={4}
              style={[
                styles.input,
                styles.textArea,
                {
                  backgroundColor: theme.colors.inputBg,
                  borderColor: theme.colors.divider,
                  color: theme.colors.textMain,
                  borderRadius: theme.radius.button,
                },
              ]}
            />

            {error ? <Text style={[styles.error, { color: theme.colors.accent }]}>{error}</Text> : null}

            <View style={styles.actionRow}>
              <TouchableOpacity
                onPress={onClose}
                style={[
                  styles.secondaryButton,
                  {
                    backgroundColor: theme.colors.inputBg,
                    borderColor: theme.colors.divider,
                    borderRadius: theme.radius.button,
                  },
                ]}
              >
                <Text style={[styles.secondaryText, { color: theme.colors.textMain }]}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                style={[
                  styles.primaryButton,
                  {
                    backgroundColor: theme.colors.primary,
                    borderRadius: theme.radius.button,
                  },
                ]}
              >
                <Text style={[styles.primaryText, { color: theme.colors.bg, fontFamily: theme.fonts.heading }]}>
                  保存
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.bottomSpacer} />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '88%',
    paddingTop: 8,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 16,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 4,
  },
  iconButton: {
    padding: 4,
  },
  body: {
    paddingHorizontal: 16,
  },
  segmentedRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    borderWidth: 1,
    paddingVertical: 9,
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '600',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 14,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  textArea: {
    minHeight: 82,
    textAlignVertical: 'top',
  },
  readOnlySlot: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  error: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    alignItems: 'center',
    paddingVertical: 14,
  },
  primaryButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
  },
  secondaryText: {
    fontSize: 15,
    fontWeight: '600',
  },
  primaryText: {
    fontSize: 15,
  },
  bottomSpacer: {
    height: 36,
  },
});
