import React, { useMemo } from 'react';
import { SectionList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { formatLocalDate, formatTime } from '../../../shared/lib/date';
import type { TimeSlotRating } from '../types';
import { pickRandomQuip } from '../copy/empty-state-quips';
import { StarRating } from './StarRating';

interface RatingHistoryListProps {
  ratings: TimeSlotRating[];
  onPressItem?: (rating: TimeSlotRating) => void;
  refreshing?: boolean;
  onRefresh?: () => void;
}

interface RatingSection {
  title: string;
  timestamp: number;
  data: TimeSlotRating[];
}

function getDateTitle(iso: string): string {
  return formatLocalDate(new Date(iso));
}

function sortByStartDesc(a: TimeSlotRating, b: TimeSlotRating): number {
  return new Date(b.slot_start).getTime() - new Date(a.slot_start).getTime();
}

function createSections(ratings: TimeSlotRating[]): RatingSection[] {
  const groups = new Map<string, TimeSlotRating[]>();

  [...ratings].sort(sortByStartDesc).forEach((rating) => {
    const key = getDateTitle(rating.slot_start);
    groups.set(key, [...(groups.get(key) ?? []), rating]);
  });

  return Array.from(groups.entries())
    .map(([title, data]) => ({
      title,
      data,
      timestamp: new Date(data[0].slot_start).setHours(0, 0, 0, 0),
    }))
    .sort((a, b) => b.timestamp - a.timestamp);
}

export function RatingHistoryList({
  ratings,
  onPressItem,
  refreshing,
  onRefresh,
}: RatingHistoryListProps) {
  const theme = useTheme();
  const sections = useMemo(() => createSections(ratings), [ratings]);
  const quip = useMemo(() => pickRandomQuip(), []);

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.id}
      stickySectionHeadersEnabled={false}
      refreshing={refreshing}
      onRefresh={onRefresh}
      contentContainerStyle={styles.content}
      ListEmptyComponent={
        <View style={styles.emptyState} testID="rating-empty-state">
          <Text style={[styles.emptyArrow, { color: theme.colors.primary, fontFamily: theme.fonts.heading }]}>
            ↘
          </Text>
          <Text style={[styles.emptyText, { color: theme.colors.textSub }]}>{quip}</Text>
        </View>
      }
      renderSectionHeader={({ section }) => (
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionDot, { backgroundColor: theme.colors.primary }]} />
          <Text style={[styles.sectionTitle, { color: theme.colors.textMain, fontFamily: theme.fonts.heading }]}>
            {section.title}
          </Text>
          <Text style={[styles.sectionCount, { color: theme.colors.textSub }]}>{section.data.length}</Text>
        </View>
      )}
      renderItem={({ item }) => {
        const start = new Date(item.slot_start);
        const end = new Date(item.slot_end);
        const activitySummary = item.activity?.trim() || '未填写活动';

        return (
          <TouchableOpacity
            activeOpacity={0.78}
            disabled={!onPressItem}
            onPress={() => onPressItem?.(item)}
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.card,
                borderColor: theme.colors.cardBorder,
                borderRadius: theme.radius.card,
              },
            ]}
            testID={`rating-history-card-${item.id}`}
          >
            <View style={styles.cardHeader}>
              <Text style={[styles.timeRange, { color: theme.colors.primary, fontFamily: theme.fonts.heading }]}>
                {formatTime(start)} - {formatTime(end)}
              </Text>
              <Text style={[styles.efficiency, { color: theme.colors.success, fontFamily: theme.fonts.heading }]}>
                EFF {item.efficiency}
              </Text>
            </View>
            <View style={styles.ratingRow}>
              <StarRating value={item.rating} disabled size={18} testID={`rating-history-stars-${item.id}`} />
            </View>
            <Text
              style={[styles.activity, { color: theme.colors.textMain }]}
              numberOfLines={2}
            >
              {activitySummary}
            </Text>
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 100,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  sectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 14,
  },
  sectionCount: {
    fontSize: 12,
    marginLeft: 8,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  timeRange: {
    fontSize: 13,
  },
  efficiency: {
    fontSize: 12,
  },
  ratingRow: {
    marginTop: 8,
  },
  activity: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
  },
  emptyState: {
    minHeight: 280,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    gap: 12,
  },
  emptyArrow: {
    alignSelf: 'flex-end',
    fontSize: 36,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
});
