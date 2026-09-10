/**
 * Shared screen scaffolding: consistent padding, safe-area handling and the
 * small status boxes every screen needs.
 */

import type { ReactNode } from 'react';
import { Platform, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** A scrolling screen body that clears the tab bar and the notch. */
export function Screen({
  children,
  scrollable = true,
  contentStyle,
}: {
  children: ReactNode;
  scrollable?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const padding = {
    paddingTop: Platform.OS === 'web' ? Spacing.six : insets.top + Spacing.two,
    paddingBottom: insets.bottom + BottomTabInset + Spacing.three,
  };

  if (!scrollable) {
    return (
      <View style={[styles.flex, { backgroundColor: theme.background }, padding, contentStyle]}>
        {children}
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: theme.background }]}
      contentContainerStyle={[styles.content, padding, contentStyle]}
      keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

export function ScreenTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  const theme = useTheme();

  return (
    <View style={styles.titleBlock}>
      <ThemedText type="subtitle">{title}</ThemedText>
      {subtitle !== undefined && (
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {subtitle}
        </ThemedText>
      )}
    </View>
  );
}

/** A neutral bordered box for empty states, hints and errors. */
export function InfoBox({
  title,
  children,
  tone = 'neutral',
}: {
  title?: string;
  children: ReactNode;
  tone?: 'neutral' | 'warning';
}) {
  const theme = useTheme();
  const accent = tone === 'warning' ? '#bf8700' : theme.textSecondary;

  return (
    <View
      style={[
        styles.infoBox,
        { backgroundColor: theme.backgroundElement, borderLeftColor: accent },
      ]}>
      {title !== undefined && <ThemedText type="smallBold">{title}</ThemedText>}
      {typeof children === 'string' ? (
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {children}
        </ThemedText>
      ) : (
        children
      )}
    </View>
  );
}

/**
 * Shown whenever the app is serving fixtures instead of live data, so demo data
 * can never be mistaken for a real bus that is about to arrive.
 */
export function MockNotice({ what }: { what: string }) {
  return (
    <InfoBox title="Sample data" tone="warning">
      {`${what} is showing made-up data because no API key is set. Copy .env.example to .env and add your keys to go live.`}
    </InfoBox>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  titleBlock: {
    gap: 2,
  },
  infoBox: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    borderLeftWidth: 3,
    gap: 3,
  },
});
