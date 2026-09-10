/**
 * Small presentational pieces shared by the Nearby, Stop and Route screens.
 */

import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { Load, Verdict, VerdictDark } from '@/constants/transit';
import { useTheme } from '@/hooks/use-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { ArrivingBus } from '@/api/types';
import { formatCountdown, secondsUntil } from '@/lib/time';
import type { MakeItLevel, MakeItVerdict } from '@/lib/makeItInTime';

/** Resolves the verdict palette for the active colour scheme. */
export function useVerdictColors(level: MakeItLevel) {
  const scheme = useColorScheme();
  return scheme === 'dark' ? VerdictDark[level] : Verdict[level];
}

/**
 * A single countdown, styled like the display at a bus stop: the soonest bus is
 * emphasised and later ones are secondary.
 */
export function Countdown({
  bus,
  now,
  primary = false,
}: {
  bus: ArrivingBus;
  now: number;
  primary?: boolean;
}) {
  const theme = useTheme();

  if (bus.arrivalMs === null) return null;
  const text = formatCountdown(secondsUntil(bus.arrivalMs, now));
  if (text === null) return null;

  const load = Load[bus.load];

  return (
    <View style={styles.countdown}>
      <ThemedText
        type={primary ? 'default' : 'small'}
        style={[
          styles.countdownText,
          primary && styles.countdownPrimary,
          { color: primary ? theme.text : theme.textSecondary },
        ]}>
        {text}
      </ThemedText>

      {load.label.length > 0 && (
        <View style={[styles.loadDot, { backgroundColor: load.color }]} />
      )}
    </View>
  );
}

/** Wheelchair and double-deck flags, only rendered when true. */
export function BusFeatures({ bus }: { bus: ArrivingBus }) {
  const theme = useTheme();
  const flags: string[] = [];

  if (bus.wheelchairAccessible) flags.push('♿');
  if (bus.doubleDeck) flags.push('2-deck');
  if (!bus.monitored) flags.push('scheduled');

  if (flags.length === 0) return null;

  return (
    <ThemedText type="small" style={{ color: theme.textSecondary }}>
      {flags.join(' · ')}
    </ThemedText>
  );
}

/**
 * The "can I make it?" banner. Colour is always paired with an icon and a
 * sentence, never used as the only signal.
 */
export function VerdictBanner({ verdict }: { verdict: MakeItVerdict }) {
  const colors = useVerdictColors(verdict.level);

  return (
    <View style={[styles.banner, { backgroundColor: colors.bg }]}>
      <View style={[styles.bannerIcon, { borderColor: colors.fg }]}>
        <ThemedText style={[styles.bannerIconText, { color: colors.fg }]}>
          {colors.icon}
        </ThemedText>
      </View>

      <View style={styles.bannerBody}>
        <ThemedText type="smallBold" style={{ color: colors.fg }}>
          {verdict.headline}
        </ThemedText>
        <ThemedText type="small" style={{ color: colors.fg }}>
          {verdict.detail}
        </ThemedText>
      </View>
    </View>
  );
}

/** A rounded chip, used for service numbers and line codes. */
export function Chip({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.chip, { backgroundColor: color }]}>
      <ThemedText type="smallBold" style={styles.chipText}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  countdown: {
    alignItems: 'center',
    minWidth: 54,
    gap: 3,
  },
  countdownText: {
    fontVariant: ['tabular-nums'],
  },
  countdownPrimary: {
    fontWeight: '700',
  },
  loadDot: {
    width: 18,
    height: 3,
    borderRadius: 2,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  bannerIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerIconText: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  bannerBody: {
    flex: 1,
    gap: 2,
  },
  chip: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: Spacing.one,
    minWidth: 42,
    alignItems: 'center',
  },
  chipText: {
    color: '#fff',
  },
});
