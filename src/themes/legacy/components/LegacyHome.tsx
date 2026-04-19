import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, SectionList, RefreshControl } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import { AppBar } from '../../../shared/components/AppBar';
import { FAB } from '../../../shared/components/FAB';
import { EventCard, EventSheet, ScheduleEvent, useEvents } from '../../../features/schedule';
import { expandRepeatingEvents } from '../../../features/schedule/domain/repeat';
import { TodoSection, useTodos } from '../../../features/todo';
import { Calendar } from 'lucide-react-native';

export function LegacyHome() {
  const theme = useTheme();
  const { events, loading, refresh } = useEvents();
  const { todos, loading: todosLoading, refresh: refreshTodos } = useTodos();
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetMode, setSheetMode] = useState<'view' | 'create' | 'edit'>('create');
  const [selectedEvent, setSelectedEvent] = useState<ScheduleEvent | null>(null);

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { todayEvents, tomorrowEvents } = useMemo(() => {
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(tomorrow);
    tomorrowStart.setHours(0, 0, 0, 0);
    const dayAfterTomorrow = new Date(tomorrowStart);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    const expanded = expandRepeatingEvents(events, todayStart, dayAfterTomorrow);

    const overlapsDay = (event: ScheduleEvent, dayStart: Date, nextDayStart: Date) => {
      const start = new Date(event.start_time).getTime();
      const end = new Date(event.end_time).getTime();
      return start < nextDayStart.getTime() && end > dayStart.getTime();
    };

    const todayEvts = expanded
      .filter((e) => overlapsDay(e, todayStart, tomorrowStart))
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    const tomorrowEvts = expanded
      .filter((e) => overlapsDay(e, tomorrowStart, dayAfterTomorrow))
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    return { todayEvents: todayEvts, tomorrowEvents: tomorrowEvts };
  }, [events, today.toDateString()]);

  const sections = [
    { title: '今日', data: todayEvents.length > 0 ? todayEvents : [null as unknown as ScheduleEvent], empty: todayEvents.length === 0 },
    { title: '明日', data: tomorrowEvents.length > 0 ? tomorrowEvents : [null as unknown as ScheduleEvent], empty: tomorrowEvents.length === 0 },
  ];

  const openEvent = (ev: ScheduleEvent) => {
    setSelectedEvent(ev);
    setSheetMode('view');
    setSheetVisible(true);
  };

  const openCreate = () => {
    setSelectedEvent(null);
    setSheetMode('create');
    setSheetVisible(true);
  };

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <AppBar
        title="CYBERSCHEDULE"
        subtitle={`${today.getFullYear()}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getDate().toString().padStart(2, '0')}`}
      />

      <SectionList
        sections={sections}
        keyExtractor={(item, idx) => (item ? item.id + idx : `empty-${idx}`)}
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl
            refreshing={loading || todosLoading}
            onRefresh={() => { refresh(); refreshTodos(); }}
            tintColor={theme.colors.primary}
          />
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionDot, { backgroundColor: theme.colors.primary }]} />
            <Text style={[styles.sectionTitle, { color: theme.colors.textMain, fontFamily: theme.fonts.heading }]}>
              {section.title}
            </Text>
            <Text style={[styles.sectionCount, { color: theme.colors.textSub }]}>
              {section.empty ? 0 : section.data.length}
            </Text>
          </View>
        )}
        renderItem={({ item, section }) => {
          if (section.empty) {
            return (
              <View style={styles.emptyState}>
                <Calendar size={32} color={theme.colors.textSub} />
                <Text style={[styles.emptyText, { color: theme.colors.textSub }]}>
                  {section.title === '今日' ? '今日无事' : '明日无事'}
                </Text>
              </View>
            );
          }
          return <EventCard event={item} onPress={() => openEvent(item)} />;
        }}
        ListFooterComponent={<TodoSection todos={todos} loading={todosLoading} />}
      />

      <FAB onPress={openCreate} />

      <EventSheet
        visible={sheetVisible}
        mode={sheetMode}
        event={selectedEvent}
        onClose={() => setSheetVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  listContent: { paddingBottom: 100 },
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
  },
});
