import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View, type DimensionValue } from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import type { RatingValue } from '../types';

interface EfficiencySliderProps {
  value: RatingValue;
  onChange?: (value: RatingValue) => void;
  disabled?: boolean;
  testID?: string;
}

const VALUES: RatingValue[] = [1, 2, 3, 4, 5];

export function EfficiencySlider({
  value,
  onChange,
  disabled = false,
  testID = 'efficiency-slider',
}: EfficiencySliderProps) {
  const theme = useTheme();
  const activeWidth = useMemo(
    () => `${((value - 1) / (VALUES.length - 1)) * 100}%` as DimensionValue,
    [value],
  );

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.trackWrap}>
        <View style={[styles.track, { backgroundColor: theme.colors.divider }]}>
          <View
            testID={`${testID}-active-range`}
            style={[
              styles.activeTrack,
              {
                width: activeWidth,
                backgroundColor: theme.colors.primary,
              },
            ]}
          />
        </View>
        <View style={styles.tickRow}>
          {VALUES.map((tickValue) => {
            const active = tickValue <= value;
            return (
              <Pressable
                key={tickValue}
                accessibilityRole="adjustable"
                accessibilityLabel={`Efficiency ${tickValue}`}
                accessibilityState={{ selected: value === tickValue, disabled }}
                disabled={disabled}
                onPress={() => onChange?.(tickValue)}
                testID={`${testID}-${tickValue}`}
                style={({ pressed }) => [
                  styles.tickHitbox,
                  { transform: [{ scale: pressed && !disabled ? 0.92 : 1 }] },
                ]}
              >
                <View
                  style={[
                    styles.tick,
                    {
                      backgroundColor: active ? theme.colors.primary : theme.colors.textSub,
                      opacity: disabled ? 0.6 : 1,
                    },
                  ]}
                />
              </Pressable>
            );
          })}
        </View>
        <View
          pointerEvents="none"
          testID={`${testID}-thumb`}
          style={[
            styles.thumb,
            {
              left: activeWidth,
              backgroundColor: theme.colors.bg,
              borderColor: theme.colors.primary,
            },
          ]}
        />
      </View>
      <Text style={[styles.value, { color: theme.colors.primary, fontFamily: theme.fonts.heading }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
    paddingBottom: 2,
  },
  trackWrap: {
    height: 34,
    justifyContent: 'center',
  },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  activeTrack: {
    height: 4,
    borderRadius: 2,
  },
  tickRow: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tickHitbox: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tick: {
    width: 4,
    height: 12,
    borderRadius: 2,
  },
  thumb: {
    position: 'absolute',
    top: 6,
    width: 22,
    height: 22,
    marginLeft: -11,
    borderRadius: 11,
    borderWidth: 2,
  },
  value: {
    alignSelf: 'center',
    fontSize: 16,
    marginTop: 2,
  },
});
