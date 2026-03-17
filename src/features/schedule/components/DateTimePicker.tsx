import React, { useEffect, useMemo, useRef } from 'react';
import {
  FlatList,
  ListRenderItem,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { ThemeConfig } from '../../../theme/types';

interface DateTimePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  theme: ThemeConfig;
  minimumHour?: number;
  allowMidnight24?: boolean;
}

type PickerColumnProps = {
  items: number[];
  selectedValue: number;
  theme: ThemeConfig;
  onSelect: (value: number) => void;
  formatter?: (value: number) => string;
};

const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

function isExactMidnight(date: Date): boolean {
  return (
    date.getHours() === 0 &&
    date.getMinutes() === 0 &&
    date.getSeconds() === 0 &&
    date.getMilliseconds() === 0
  );
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function clampValue(value: number, items: number[]): number {
  if (items.length === 0) return value;
  if (items.includes(value)) return value;
  if (value < items[0]) return items[0];
  return items[items.length - 1];
}

function getDisplayState(value: Date, allowMidnight24: boolean, minimumHour: number) {
  if (allowMidnight24 && isExactMidnight(value)) {
    return {
      displayDate: addDays(value, -1),
      hour: 24,
      minute: 0,
    };
  }

  return {
    displayDate: new Date(value),
    hour: Math.max(value.getHours(), minimumHour),
    minute: value.getMinutes(),
  };
}

function PickerColumn({
  items,
  selectedValue,
  theme,
  onSelect,
  formatter = (value) => value.toString().padStart(2, '0'),
}: PickerColumnProps) {
  const listRef = useRef<FlatList<number>>(null);
  const paddingItemCount = Math.floor(VISIBLE_ITEMS / 2);
  const initialIndex = Math.max(0, items.indexOf(selectedValue));
  const paddedItems = useMemo(
    () => [
      ...Array.from({ length: paddingItemCount }, () => Number.NaN),
      ...items,
      ...Array.from({ length: paddingItemCount }, () => Number.NaN),
    ],
    [items, paddingItemCount],
  );

  useEffect(() => {
    const index = items.indexOf(selectedValue);
    if (index === -1) return;
    listRef.current?.scrollToOffset({
      offset: index * ITEM_HEIGHT,
      animated: false,
    });
  }, [items, selectedValue]);

  const resolveSelection = (offsetY: number) => {
    const rawIndex = Math.round(offsetY / ITEM_HEIGHT);
    const nextIndex = Math.max(0, Math.min(items.length - 1, rawIndex));
    onSelect(items[nextIndex]);
  };

  const handleMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    resolveSelection(event.nativeEvent.contentOffset.y);
  };

  const renderItem: ListRenderItem<number> = ({ item }) => {
    if (Number.isNaN(item)) {
      return <View style={{ height: ITEM_HEIGHT }} />;
    }

    const selected = item === selectedValue;
    return (
      <Pressable style={styles.pickerItem} onPress={() => onSelect(item)}>
        <Text
          style={[
            styles.pickerText,
            {
              color: selected ? theme.colors.primary : theme.colors.textSub,
              fontWeight: selected ? '700' : '500',
            },
          ]}
        >
          {formatter(item)}
        </Text>
      </Pressable>
    );
  };

  return (
    <View
      style={[
        styles.wheel,
        {
          backgroundColor: theme.colors.inputBg,
          borderRadius: theme.radius.button,
          borderColor: theme.colors.divider,
        },
      ]}
    >
      <View
        pointerEvents="none"
        style={[
          styles.selectionOverlay,
          {
            top: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2),
            borderColor: theme.colors.primary,
            backgroundColor: `${theme.colors.primary}14`,
          },
        ]}
      />
      <FlatList
        ref={listRef}
        data={paddedItems}
        keyExtractor={(item, index) => `${Number.isNaN(item) ? 'pad' : item}-${index}`}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        initialScrollIndex={initialIndex}
        getItemLayout={(_, index) => ({
          index,
          length: ITEM_HEIGHT,
          offset: ITEM_HEIGHT * index,
        })}
        onMomentumScrollEnd={handleMomentumEnd}
        contentContainerStyle={styles.wheelContent}
      />
    </View>
  );
}

export default function DateTimePicker({
  value,
  onChange,
  theme,
  minimumHour = 6,
  allowMidnight24 = false,
}: DateTimePickerProps) {
  const { displayDate, hour, minute } = getDisplayState(value, allowMidnight24, minimumHour);

  const hourOptions = useMemo(() => {
    const items = Array.from({ length: 24 - minimumHour }, (_, index) => index + minimumHour);
    return allowMidnight24 ? [...items, 24] : items;
  }, [allowMidnight24, minimumHour]);

  const minuteOptions = useMemo(() => (hour === 24 ? [0] : Array.from({ length: 60 }, (_, index) => index)), [hour]);

  useEffect(() => {
    const nextHour = clampValue(hour, hourOptions);
    const nextMinute = nextHour === 24 ? 0 : clampValue(minute, minuteOptions);
    const shouldNormalizeDate =
      displayDate.getFullYear() !== value.getFullYear() ||
      displayDate.getMonth() !== value.getMonth() ||
      displayDate.getDate() !== value.getDate();
    const shouldNormalizeTime =
      nextHour !== value.getHours() ||
      nextMinute !== value.getMinutes() ||
      value.getSeconds() !== 0 ||
      value.getMilliseconds() !== 0;

    if (!shouldNormalizeDate && !shouldNormalizeTime) {
      return;
    }

    const normalizedDate = new Date(displayDate);
    if (nextHour === 24) {
      normalizedDate.setHours(0, 0, 0, 0);
      normalizedDate.setDate(normalizedDate.getDate() + 1);
    } else {
      normalizedDate.setHours(nextHour, nextMinute, 0, 0);
    }

    if (normalizedDate.getTime() !== value.getTime()) {
      onChange(normalizedDate);
    }
  }, [allowMidnight24, displayDate, hour, hourOptions, minute, minimumHour, minuteOptions, onChange, value]);

  const updateValue = (nextDate: Date, nextHour: number, nextMinute: number) => {
    const normalizedDate = new Date(nextDate);
    normalizedDate.setSeconds(0, 0);

    if (nextHour === 24) {
      normalizedDate.setHours(0, 0, 0, 0);
      normalizedDate.setDate(normalizedDate.getDate() + 1);
      onChange(normalizedDate);
      return;
    }

    normalizedDate.setHours(nextHour, nextMinute, 0, 0);
    onChange(normalizedDate);
  };

  const handleAdjustDate = (days: number) => {
    updateValue(addDays(displayDate, days), hour, minute);
  };

  const handleSelectHour = (nextHour: number) => {
    updateValue(displayDate, nextHour, nextHour === 24 ? 0 : minute);
  };

  const handleSelectMinute = (nextMinute: number) => {
    updateValue(displayDate, hour, nextMinute);
  };

  const dateText = `${displayDate.getFullYear()}-${(displayDate.getMonth() + 1)
    .toString()
    .padStart(2, '0')}-${displayDate.getDate().toString().padStart(2, '0')}`;

  const selectedHour = clampValue(hour, hourOptions);
  const selectedMinute = clampValue(minute, minuteOptions);

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.dateSegment,
          {
            backgroundColor: theme.colors.inputBg,
            borderRadius: theme.radius.button,
          },
        ]}
      >
        <TouchableOpacity onPress={() => handleAdjustDate(-1)} style={styles.arrowBtn}>
          <ChevronDown size={16} color={theme.colors.textSub} />
        </TouchableOpacity>
        <Text style={[styles.dateText, { color: theme.colors.textMain }]}>{dateText}</Text>
        <TouchableOpacity onPress={() => handleAdjustDate(1)} style={styles.arrowBtn}>
          <ChevronUp size={16} color={theme.colors.textSub} />
        </TouchableOpacity>
      </View>

      <View style={styles.timeGroup}>
        <PickerColumn
          items={hourOptions}
          selectedValue={selectedHour}
          theme={theme}
          onSelect={handleSelectHour}
          formatter={(item) => item.toString().padStart(2, '0')}
        />
        <Text style={[styles.colon, { color: theme.colors.primary }]}>:</Text>
        <PickerColumn
          items={minuteOptions}
          selectedValue={selectedMinute}
          theme={theme}
          onSelect={handleSelectMinute}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  dateSegment: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  arrowBtn: {
    padding: 6,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '500',
  },
  timeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  wheel: {
    height: PICKER_HEIGHT,
    width: 84,
    borderWidth: 1,
    overflow: 'hidden',
  },
  wheelContent: {
    paddingVertical: 0,
  },
  selectionOverlay: {
    position: 'absolute',
    left: 6,
    right: 6,
    height: ITEM_HEIGHT,
    borderWidth: 1,
    borderRadius: 10,
    zIndex: 1,
  },
  pickerItem: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerText: {
    fontSize: 18,
  },
  colon: {
    fontSize: 22,
    fontWeight: '700',
  },
});
