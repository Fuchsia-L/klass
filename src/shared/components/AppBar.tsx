import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';

interface AppBarProps {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}

export function AppBar({ title, subtitle, right }: AppBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + 8,
          backgroundColor: theme.colors.bg,
          borderBottomColor: theme.colors.divider,
        },
      ]}
    >
      <View style={styles.left}>
        <Text style={[styles.title, { color: theme.colors.primary, fontFamily: theme.fonts.heading }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: theme.colors.textSub }]}>{subtitle}</Text>
        ) : null}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  left: { flex: 1 },
  title: { fontSize: 20 },
  subtitle: { fontSize: 12, marginTop: 2 },
  right: { marginLeft: 12 },
});
