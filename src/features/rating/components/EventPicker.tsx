import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { formatLocalDate, formatTime } from '../../../shared/lib/date';
import { getCategoryColor, ScheduleEvent } from '../../schedule';

interface EventPickerProps {
  events: ScheduleEvent[];
  selectedEventId?: string;
  onSelect: (event: ScheduleEvent) => void;
  testID?: string;
}

export function EventPicker({
  events,
  selectedEventId,
  onSelect,
  testID = 'rating-event-picker',
}: EventPickerProps) {
  const theme = useTheme();

  if (events.length === 0) {
    return (
      <View style={styles.empty} testID={testID}>
        <Text style={[styles.emptyText, { color: theme.colors.textSub }]}>最近没有日程</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.list} testID={testID} showsVerticalScrollIndicator={false}>
      {events.map((event) => {
        const selected = event.id === selectedEventId;
        const start = new Date(event.start_time);
        const end = new Date(event.end_time);
        const categoryColor = getCategoryColor(theme, event.category);

        return (
          <TouchableOpacity
            key={`${event.id}-${event.start_time}`}
            onPress={() => onSelect(event)}
            activeOpacity={0.75}
            testID={`${testID}-item-${event.id}`}
            style={[
              styles.row,
              {
                backgroundColor: selected ? theme.colors.inputBg : theme.colors.card,
                borderColor: selected ? theme.colors.primary : theme.colors.divider,
                borderLeftColor: categoryColor,
                borderRadius: theme.radius.button,
              },
            ]}
          >
            <Text style={[styles.title, { color: theme.colors.textMain }]} numberOfLines={1}>
              {event.title}
            </Text>
            <Text style={[styles.time, { color: theme.colors.textSub }]}>
              {formatLocalDate(start)} {formatTime(start)}-{formatTime(end)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: {
    maxHeight: 240,
  },
  row: {
    borderWidth: 1,
    borderLeftWidth: 4,
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginBottom: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
  },
  time: {
    fontSize: 12,
    marginTop: 4,
  },
  empty: {
    maxHeight: 240,
    alignItems: 'center',
    paddingVertical: 18,
  },
  emptyText: {
    fontSize: 14,
  },
});
