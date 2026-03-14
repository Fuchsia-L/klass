import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Plus } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';

interface FABProps {
  onPress: () => void;
}

export function FAB({ onPress }: FABProps) {
  const theme = useTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        styles.fab,
        {
          backgroundColor: theme.colors.accent,
          shadowColor: theme.colors.card || '#111827',
        },
      ]}
    >
      <Plus size={28} color={theme.colors.textMain} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
});
