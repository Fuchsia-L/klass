import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { ThemeConfig } from '../../../theme/types';

interface DateTimePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  theme: ThemeConfig;
}

export default function DateTimePicker({ value, onChange, theme }: DateTimePickerProps) {
  const adjustDate = (days: number) => {
    const next = new Date(value);
    next.setDate(next.getDate() + days);
    onChange(next);
  };

  const adjustHour = (delta: number) => {
    const next = new Date(value);
    next.setHours(next.getHours() + delta);
    onChange(next);
  };

  const adjustMinute = (delta: number) => {
    const next = new Date(value);
    next.setMinutes(next.getMinutes() + delta);
    onChange(next);
  };

  const dateStr = `${value.getFullYear()}-${(value.getMonth() + 1)
    .toString()
    .padStart(2, '0')}-${value.getDate().toString().padStart(2, '0')}`;

  return (
    <View style={styles.container}>
      <View style={[styles.segment, { backgroundColor: theme.colors.inputBg, borderRadius: theme.radius.button }]}>
        <TouchableOpacity onPress={() => adjustDate(-1)} style={styles.arrowBtn}>
          <ChevronDown size={16} color={theme.colors.textSub} />
        </TouchableOpacity>
        <Text style={[styles.dateText, { color: theme.colors.textMain }]}>{dateStr}</Text>
        <TouchableOpacity onPress={() => adjustDate(1)} style={styles.arrowBtn}>
          <ChevronUp size={16} color={theme.colors.textSub} />
        </TouchableOpacity>
      </View>

      <View style={[styles.segment, { backgroundColor: theme.colors.inputBg, borderRadius: theme.radius.button }]}>
        <TouchableOpacity onPress={() => adjustHour(-1)} style={styles.arrowBtn}>
          <ChevronDown size={16} color={theme.colors.textSub} />
        </TouchableOpacity>
        <Text style={[styles.timeText, { color: theme.colors.primary }]}>
          {value.getHours().toString().padStart(2, '0')}
        </Text>
        <TouchableOpacity onPress={() => adjustHour(1)} style={styles.arrowBtn}>
          <ChevronUp size={16} color={theme.colors.textSub} />
        </TouchableOpacity>
      </View>

      <Text style={[styles.colon, { color: theme.colors.primary }]}>:</Text>

      <View style={[styles.segment, { backgroundColor: theme.colors.inputBg, borderRadius: theme.radius.button }]}>
        <TouchableOpacity onPress={() => adjustMinute(-15)} style={styles.arrowBtn}>
          <ChevronDown size={16} color={theme.colors.textSub} />
        </TouchableOpacity>
        <Text style={[styles.timeText, { color: theme.colors.primary }]}>
          {value.getMinutes().toString().padStart(2, '0')}
        </Text>
        <TouchableOpacity onPress={() => adjustMinute(15)} style={styles.arrowBtn}>
          <ChevronUp size={16} color={theme.colors.textSub} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  segment: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  arrowBtn: {
    padding: 4,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '500',
    marginHorizontal: 4,
  },
  timeText: {
    fontSize: 16,
    fontWeight: '700',
    marginHorizontal: 2,
    minWidth: 24,
    textAlign: 'center',
  },
  colon: {
    fontSize: 16,
    fontWeight: '700',
  },
});
