import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Clock, MapPin } from 'lucide-react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { formatTime } from '../../../shared/lib/date';
import { CATEGORIES, ScheduleEvent } from '../types';

interface EventCardProps {
  event: ScheduleEvent;
  onPress?: () => void;
}

export function EventCard({ event, onPress }: EventCardProps) {
  const theme = useTheme();
  const category = CATEGORIES[event.category];
  const start = new Date(event.start_time);
  const end = new Date(event.end_time);

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.card,
          borderRadius: theme.radius.card,
          borderColor: theme.colors.cardBorder,
          opacity: event.is_completed ? 0.5 : 1,
        },
      ]}
    >
      <View style={[styles.categoryBar, { backgroundColor: category.color }]} />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text
            style={[
              styles.title,
              {
                color: theme.colors.textMain,
                textDecorationLine: event.is_completed ? 'line-through' : 'none',
              },
            ]}
            numberOfLines={1}
          >
            {event.title}
          </Text>
          <Text style={[styles.categoryLabel, { color: category.color }]}>{category.label}</Text>
        </View>
        <View style={styles.meta}>
          <Clock size={12} color={theme.colors.textSub} />
          <Text style={[styles.metaText, { color: theme.colors.textSub }]}>
            {formatTime(start)} - {formatTime(end)}
          </Text>
          {event.location ? (
            <>
              <MapPin size={12} color={theme.colors.textSub} style={{ marginLeft: 8 }} />
              <Text style={[styles.metaText, { color: theme.colors.textSub }]} numberOfLines={1}>
                {event.location}
              </Text>
            </>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderWidth: 1,
    marginHorizontal: 16,
    marginVertical: 4,
    overflow: 'hidden',
  },
  categoryBar: {
    width: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  categoryLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginLeft: 8,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  metaText: {
    fontSize: 12,
    marginLeft: 4,
  },
});
