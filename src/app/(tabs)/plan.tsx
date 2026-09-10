/**
 * Plan — "how do I get from A to B, and how long will it take?"
 *
 * Results come from OneMap's public transport routing. Note that OneMap takes a
 * *departure* time only; there is no arrive-by parameter, which is why the time
 * control is labelled "Leave at".
 */

import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';

import { planJourney } from '@/api/onemap';
import type { Journey } from '@/api/types';
import { ThemedText } from '@/components/themed-text';
import { Chip } from '@/components/transit/arrival-pieces';
import { PlaceInput, type PlaceValue } from '@/components/transit/place-input';
import { InfoBox, MockNotice, Screen, ScreenTitle } from '@/components/transit/screen';
import { USE_MOCK_ONEMAP } from '@/config';
import { Spacing } from '@/constants/theme';
import { legColor, modeLabel } from '@/constants/transit';
import { useLocation } from '@/hooks/use-location';
import { useTheme } from '@/hooks/use-theme';
import { formatDistance } from '@/lib/geo';
import { setPlannedTrip } from '@/lib/journeyStore';
import { formatDuration, formatSgTime } from '@/lib/time';

export default function PlanScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { position, status } = useLocation(false);

  const [from, setFrom] = useState<PlaceValue | null>(null);
  const [to, setTo] = useState<PlaceValue | null>(null);
  const [departAt, setDepartAt] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  const plan = useMutation({
    mutationFn: async () => {
      if (!from || !to) throw new Error('Choose both a start and a destination.');

      const departAtMs = departAt?.getTime() ?? Date.now();
      const journeys = await planJourney({
        from: { lat: from.lat, lng: from.lng },
        to: { lat: to.lat, lng: to.lng },
        departAtMs,
      });

      setPlannedTrip({
        journeys,
        from: { name: from.name, point: { lat: from.lat, lng: from.lng } },
        to: { name: to.name, point: { lat: to.lat, lng: to.lng } },
        departAtMs,
      });

      return journeys;
    },
  });

  const useMyLocation = () => {
    if (position) {
      setFrom({ name: 'My location', lat: position.lat, lng: position.lng });
    }
  };

  const onPickTime = (event: DateTimePickerEvent, picked?: Date) => {
    // Android fires the event and closes; iOS keeps the spinner mounted.
    if (Platform.OS === 'android') setShowPicker(false);
    if (event.type === 'set' && picked) setDepartAt(picked);
  };

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  const canPlan = from !== null && to !== null && !plan.isPending;

  return (
    <Screen>
      <ScreenTitle title="Plan a journey" subtitle="Bus and MRT routes across Singapore" />

      {USE_MOCK_ONEMAP && <MockNotice what="Journey planning" />}

      <PlaceInput
        label="From"
        placeholder="Address, building or postal code"
        value={from}
        onChange={setFrom}
        onUseMyLocation={position ? useMyLocation : undefined}
      />

      {status === 'denied' && (
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          Allow location access to use your current position as the starting point.
        </ThemedText>
      )}

      <Pressable onPress={swap} accessibilityRole="button" style={styles.swap}>
        <ThemedText type="linkPrimary">⇅ Swap</ThemedText>
      </Pressable>

      <PlaceInput
        label="To"
        placeholder="Address, building or postal code"
        value={to}
        onChange={setTo}
      />

      <View style={styles.timeRow}>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          Leave at
        </ThemedText>

        <Pressable
          onPress={() => setShowPicker(true)}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.timeButton,
            { backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement },
          ]}>
          <ThemedText type="small">
            {departAt ? formatSgTime(departAt.getTime()) : 'Now'}
          </ThemedText>
        </Pressable>

        {departAt && (
          <Pressable onPress={() => setDepartAt(null)} accessibilityRole="button">
            <ThemedText type="linkPrimary">Reset to now</ThemedText>
          </Pressable>
        )}
      </View>

      {showPicker && (
        <DateTimePicker
          mode="time"
          value={departAt ?? new Date()}
          onChange={onPickTime}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
        />
      )}
      {Platform.OS === 'ios' && showPicker && (
        <Pressable onPress={() => setShowPicker(false)} accessibilityRole="button">
          <ThemedText type="linkPrimary">Done</ThemedText>
        </Pressable>
      )}

      <Pressable
        onPress={() => plan.mutate()}
        disabled={!canPlan}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.submit,
          { backgroundColor: theme.text, opacity: canPlan ? (pressed ? 0.8 : 1) : 0.4 },
        ]}>
        {plan.isPending ? (
          <ActivityIndicator color={theme.background} />
        ) : (
          <ThemedText type="smallBold" style={{ color: theme.background }}>
            Find routes
          </ThemedText>
        )}
      </Pressable>

      {plan.isError && (
        <InfoBox title="Could not plan that journey" tone="warning">
          {plan.error instanceof Error ? plan.error.message : 'Something went wrong.'}
        </InfoBox>
      )}

      {plan.data?.length === 0 && (
        <InfoBox title="No routes found">
          OneMap could not find a public transport route between those points at
          that time. Late at night, try a departure time during service hours.
        </InfoBox>
      )}

      {plan.data?.map((journey) => (
        <JourneyCard
          key={journey.id}
          journey={journey}
          onPress={() => router.push({ pathname: '/route/[id]', params: { id: journey.id } })}
        />
      ))}
    </Screen>
  );
}

function JourneyCard({ journey, onPress }: { journey: Journey; onPress: () => void }) {
  const theme = useTheme();
  const transitLegs = journey.legs.filter((leg) => leg.mode !== 'WALK');

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Route taking ${formatDuration(journey.durationSec)}`}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement },
      ]}>
      <View style={styles.cardHeader}>
        <ThemedText type="default" style={styles.duration}>
          {formatDuration(journey.durationSec)}
        </ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {formatSgTime(journey.startMs)} → {formatSgTime(journey.endMs)}
        </ThemedText>
      </View>

      <View style={styles.chips}>
        {transitLegs.length === 0 ? (
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Walk the whole way
          </ThemedText>
        ) : (
          transitLegs.map((leg, index) => (
            <View key={index} style={styles.chipRow}>
              <Chip
                label={leg.routeName ?? modeLabel(leg.mode)}
                color={legColor(leg.mode, leg.routeName)}
              />
              {index < transitLegs.length - 1 && (
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  ›
                </ThemedText>
              )}
            </View>
          ))
        )}
      </View>

      <ThemedText type="small" style={{ color: theme.textSecondary }}>
        {[
          `${journey.transfers} transfer${journey.transfers === 1 ? '' : 's'}`,
          `${formatDistance(journey.walkMetres)} walking`,
          journey.fare ? `$${journey.fare}` : null,
        ]
          .filter(Boolean)
          .join(' · ')}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  swap: {
    alignSelf: 'flex-end',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  timeButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
    minWidth: 72,
    alignItems: 'center',
  },
  submit: {
    paddingVertical: Spacing.three,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  duration: {
    fontWeight: '700',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.one,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
});
