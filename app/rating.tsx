import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { X } from 'lucide-react-native';
import { AppBar } from '../src/shared/components/AppBar';
import { FAB } from '../src/shared/components/FAB';
import {
  DayView,
  RatingHistoryList,
  RatingInputSheet,
  StarRating,
  useRatings,
} from '../src/features/rating';
import type { RatingInput, TimeSlotRating } from '../src/features/rating';
import { ScheduleEvent, useEvents } from '../src/features/schedule';
import { formatLocalDate, formatTime } from '../src/shared/lib/date';
import { useTheme } from '../src/theme/ThemeContext';

const ONE_HOUR_MS = 60 * 60 * 1000;

function getDefaultRatingSlot(): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date(end.getTime() - ONE_HOUR_MS);
  return { start, end };
}

function formatSlotRange(rating: TimeSlotRating): string {
  const start = new Date(rating.slot_start);
  const end = new Date(rating.slot_end);

  return `${formatLocalDate(start)} ${formatTime(start)} - ${formatTime(end)}`;
}

function RatingDetailModal({
  rating,
  onClose,
  onDelete,
}: {
  rating: TimeSlotRating | null;
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  const theme = useTheme();

  const handleDeletePress = () => {
    if (!rating) return;
    Alert.alert('删除这条打分？', '删除后本地列表和云端都不再显示，可通过同步协议恢复。', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => onDelete(rating.id),
      },
    ]);
  };

  return (
    <Modal visible={!!rating} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.detailOverlay, { backgroundColor: theme.colors.overlay }]} onPress={onClose}>
        <Pressable
          style={[
            styles.detailCard,
            {
              backgroundColor: theme.colors.bg,
              borderColor: theme.colors.cardBorder,
              borderRadius: theme.radius.card,
            },
          ]}
          onPress={() => {}}
          testID="rating-detail-modal"
        >
          {rating ? (
            <>
              <View style={styles.detailHeader}>
                <View style={styles.detailTitleGroup}>
                  <Text style={[styles.detailTitle, { color: theme.colors.primary, fontFamily: theme.fonts.heading }]}>
                    RATING DETAIL
                  </Text>
                  <Text style={[styles.detailSubtitle, { color: theme.colors.textSub }]}>
                    {formatSlotRange(rating)}
                  </Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.detailCloseButton} testID="rating-detail-close">
                  <X size={20} color={theme.colors.textSub} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={[styles.detailLabel, { color: theme.colors.textSub }]}>Rating</Text>
                <StarRating value={rating.rating} disabled size={22} testID="rating-detail-stars" />

                <Text style={[styles.detailLabel, { color: theme.colors.textSub }]}>Efficiency</Text>
                <Text style={[styles.detailValue, { color: theme.colors.success, fontFamily: theme.fonts.heading }]}>
                  EFF {rating.efficiency}
                </Text>

                <Text style={[styles.detailLabel, { color: theme.colors.textSub }]}>活动</Text>
                <Text style={[styles.detailBodyText, { color: theme.colors.textMain }]}>
                  {rating.activity?.trim() || '未填写活动'}
                </Text>

                <Text style={[styles.detailLabel, { color: theme.colors.textSub }]}>心情</Text>
                <Text style={[styles.detailBodyText, { color: theme.colors.textMain }]}>
                  {rating.mood?.trim() || '未填写心情'}
                </Text>

                <Text style={[styles.detailLabel, { color: theme.colors.textSub }]}>反思</Text>
                <Text style={[styles.detailBodyText, styles.detailReflection, { color: theme.colors.textMain }]}>
                  {rating.reflection?.trim() || '未填写反思'}
                </Text>
              </ScrollView>

              <TouchableOpacity
                onPress={handleDeletePress}
                style={[
                  styles.detailDeleteButton,
                  {
                    backgroundColor: theme.colors.inputBg,
                    borderColor: theme.colors.danger,
                    borderRadius: theme.radius.button,
                  },
                ]}
                testID="rating-detail-delete-button"
              >
                <Text style={[styles.detailDeleteText, { color: theme.colors.danger }]}>删除</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function RatingScreen() {
  const theme = useTheme();
  const { ratings, loading, error, refresh, save, remove } = useRatings();
  const { events } = useEvents();
  const [sheetVisible, setSheetVisible] = useState(false);
  const [defaultSlot, setDefaultSlot] = useState(getDefaultRatingSlot);
  const [selectedRating, setSelectedRating] = useState<TimeSlotRating | null>(null);
  const [activeTab, setActiveTab] = useState<'day' | 'list'>('day');
  const [dayViewDate, setDayViewDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [defaultEventForSheet, setDefaultEventForSheet] = useState<ScheduleEvent | undefined>();

  const openCreate = () => {
    setDefaultEventForSheet(undefined);
    setDefaultSlot(getDefaultRatingSlot());
    setSheetVisible(true);
  };

  const openCreateForEvent = (event: ScheduleEvent) => {
    setDefaultEventForSheet(event);
    setDefaultSlot({
      start: new Date(event.start_time),
      end: new Date(event.end_time),
    });
    setSheetVisible(true);
  };

  const handleSave = async (input: RatingInput, id?: string) => {
    await save(input, id);
  };

  const handleDelete = async (id: string) => {
    setSelectedRating(null);
    await remove(id);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.bg }]}>
      <AppBar title="RATING" subtitle="记录完成时段的质量与效率" />

      {error ? (
        <Text style={[styles.error, { color: theme.colors.accent }]} testID="rating-screen-error">
          {error}
        </Text>
      ) : null}

      <View style={styles.tabRow}>
        <TouchableOpacity
          onPress={() => setActiveTab('day')}
          style={[
            styles.tab,
            { borderBottomColor: activeTab === 'day' ? theme.colors.primary : 'transparent' },
          ]}
          testID="rating-tab-day"
        >
          <Text style={[styles.tabText, { color: activeTab === 'day' ? theme.colors.primary : theme.colors.textSub }]}>
            日视图
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('list')}
          style={[
            styles.tab,
            { borderBottomColor: activeTab === 'list' ? theme.colors.primary : 'transparent' },
          ]}
          testID="rating-tab-list"
        >
          <Text style={[styles.tabText, { color: activeTab === 'list' ? theme.colors.primary : theme.colors.textSub }]}>
            列表
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'day' ? (
        <DayView
          events={events}
          ratings={ratings}
          date={dayViewDate}
          onDateChange={setDayViewDate}
          onPressEvent={openCreateForEvent}
          onPressRating={setSelectedRating}
        />
      ) : (
        <RatingHistoryList
          ratings={ratings}
          refreshing={loading}
          onRefresh={refresh}
          onPressItem={setSelectedRating}
        />
      )}

      <FAB onPress={openCreate} />

      <RatingInputSheet
        visible={sheetVisible}
        defaultStart={defaultSlot.start}
        defaultEnd={defaultSlot.end}
        defaultEvent={defaultEventForSheet}
        onSave={handleSave}
        onClose={() => {
          setSheetVisible(false);
          setDefaultEventForSheet(undefined);
        }}
      />

      <RatingDetailModal
        rating={selectedRating}
        onClose={() => setSelectedRating(null)}
        onDelete={handleDelete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  error: {
    paddingHorizontal: 16,
    paddingTop: 12,
    fontSize: 13,
    fontWeight: '600',
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 13,
  },
  detailOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 18,
  },
  detailCard: {
    maxHeight: '78%',
    borderWidth: 1,
    padding: 16,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  detailTitleGroup: {
    flex: 1,
  },
  detailTitle: {
    fontSize: 16,
  },
  detailSubtitle: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 18,
  },
  detailCloseButton: {
    padding: 4,
  },
  detailLabel: {
    marginTop: 14,
    marginBottom: 6,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 16,
  },
  detailBodyText: {
    fontSize: 15,
    lineHeight: 22,
  },
  detailReflection: {
    paddingBottom: 8,
  },
  detailDeleteButton: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  detailDeleteText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
