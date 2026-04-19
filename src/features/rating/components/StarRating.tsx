import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Star } from 'lucide-react-native';
import { useTheme } from '../../../theme/ThemeContext';
import type { RatingValue } from '../types';

interface StarRatingProps {
  value: RatingValue;
  onChange?: (value: RatingValue) => void;
  size?: number;
  disabled?: boolean;
  testID?: string;
}

const VALUES: RatingValue[] = [1, 2, 3, 4, 5];

export function StarRating({
  value,
  onChange,
  size = 28,
  disabled = false,
  testID = 'star-rating',
}: StarRatingProps) {
  const theme = useTheme();

  return (
    <View style={[styles.row, disabled && styles.rowCompact]} testID={testID}>
      {VALUES.map((starValue) => {
        const active = starValue <= value;
        return (
          <Pressable
            key={starValue}
            accessibilityRole="button"
            accessibilityLabel={`${starValue} star rating`}
            accessibilityState={{ selected: active, disabled }}
            disabled={disabled}
            onPress={() => onChange?.(starValue)}
            testID={`${testID}-${starValue}`}
            style={({ pressed }) => [
              disabled ? styles.starButtonCompact : styles.starButton,
              {
                opacity: disabled ? 0.6 : 1,
                transform: [{ scale: pressed && !disabled ? 0.86 : 1 }],
              },
            ]}
          >
            <Star
              size={size}
              color={active ? theme.colors.primary : theme.colors.textSub}
              fill={active ? theme.colors.primary : 'transparent'}
              strokeWidth={active ? 2 : 1.7}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowCompact: {
    gap: 2,
  },
  starButton: {
    minWidth: 36,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starButtonCompact: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
