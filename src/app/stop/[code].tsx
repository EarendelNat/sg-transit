/**
 * Stop detail — every service at one stop, live, with a "can I make it?"
 * verdict per service and the approaching buses plotted on the map.
 */

import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { getBusArrivals } from '@/api/lta';
import type { ServiceArrivals } from '@/api/types';
import { ThemedText } from '@/components/themed-text';
import {
  BusFeatures,
  Chip,
  Countdown,
  VerdictBanner,
} from '@/components/transit/arrival-pieces';
import { InfoBox, MockNotice, Screen, ScreenTitle } from '@/components/transit/screen';
import { ARRIVAL_POLL_MS, USE_MOCK_LTA } from '@/config';
import { Spacing } from '@/constants/theme';
import { useLocation } from '@/hooks/use-location';
import { useMakeItVerdict } from '@/hooks/use-make-it-verdict';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { getBusStop } from '@/lib/busStopDb';
import { getFavourites, toggleFavourite } from '@/lib/favourites';
import { formatDistance, haversineMetres } from '@/lib/geo';

export default function StopScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const stopCode = code ?? '';

  const theme = useTheme();
  const now = useNow();
  const { position } = useLocation(true);

  const [saved, setSaved] = useState(false);
  const [selectedService, setSelectedService] = useState<string | null>(null);

  const stop = useQuery({
    queryKey: ['bus-stop', stopCode],
    queryFn: () => getBusStop(stopCode),
    staleTime: Infinity,
  });

  const arrivals = useQuery({
    queryKey: ['arrivals', stopCode],
    queryFn: () => getBusArrivals(stopCode),
    refetchInterval: ARRIVAL_POLL_MS,
  });

  useEffect(() => {
    void getFavourites().then((codes) => setSaved(codes.includes(stopCode)));
  }, [stopCode]);

  const onToggleSave = useCallback(async () => {
    const codes = await toggleFavourite(stopCode);
    setSaved(codes.includes(stopCode));
  }, [stopCode]);

  const stopPoint = stop.data ? { lat: stop.data.lat, lng: stop.data.lng } : null;

  // Default the verdict to whichever service arrives soonest, but let the user
  // pick the one they actually want to catch.
  const services = arrivals.data ?? [];
  const activeService = selectedService ?? services[0]?.serviceNo ?? null;

  const makeIt = useMakeItVerdict({
    stopCode: stopPoint ? stopCode : null,
    stopPoint,
    serviceNo: activeService,
    from: position,
  });

  const distance =
    position && stopPoint ? haversineMetres(position, stopPoint) : null;

  return (
    <Screen>
      <View style={styles.header}>
        <ScreenTitle
          title={stop.data?.description ?? `Stop ${stopCode}`}
          subtitle={
            stop.data
              ? `${stop.data.roadName} · ${stopCode}${
                  distance !== null ? ` · ${formatDistance(distance)} away` : ''
                }`
              : undefined
          }
        />

        <Pressable
          onPress={onToggleSave}
          accessibilityRole="button"
          accessibilityLabel={saved ? 'Remove from saved stops' : 'Save this stop'}
          style={({ pressed }) => [
            styles.saveButton,
            { backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement },
          ]}>
          <ThemedText type="small">{saved ? '★ Saved' : '☆ Save'}</ThemedText>
        </Pressable>
      </View>

      {USE_MOCK_LTA && <MockNotice what="This stop" />}

      {makeIt.verdict && activeService && (
        <View style={styles.verdict}>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {`Catching service ${activeService}`}
          </ThemedText>
          <VerdictBanner verdict={makeIt.verdict} />
        </View>
      )}

      {!position && (
        <InfoBox title="Waiting for GPS">
          Once your location is available, this screen will tell you whether you
          can still reach this stop in time.
        </InfoBox>
      )}

      {arrivals.isError && (
        <InfoBox title="Could not load arrivals" tone="warning">
          {arrivals.error instanceof Error ? arrivals.error.message : 'Request failed.'}
        </InfoBox>
      )}

      {arrivals.isLoading && (
        <View style={styles.centre}>
          <ActivityIndicator color={theme.textSecondary} />
        </View>
      )}

      {arrivals.data?.length === 0 && (
        <InfoBox title="Nothing running">
          No buses are currently scheduled at this stop. Services may have ended
          for the night.
        </InfoBox>
      )}

      {services.map((service) => (
        <ServiceCard
          key={service.serviceNo}
          service={service}
          now={now}
          selected={service.serviceNo === activeService}
          onSelect={() => setSelectedService(service.serviceNo)}
        />
      ))}
    </Screen>
  );
}

function ServiceCard({
  service,
  now,
  selected,
  onSelect,
}: {
  service: ServiceArrivals;
  now: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onSelect}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`Service ${service.serviceNo}`}
      style={({ pressed }) => [
        styles.serviceCard,
        {
          backgroundColor:
            selected || pressed ? theme.backgroundSelected : theme.backgroundElement,
        },
      ]}>
      <Chip label={service.serviceNo} color={theme.text} />

      <View style={styles.countdowns}>
        {service.buses.slice(0, 3).map((bus, index) => (
          <Countdown key={bus.arrivalMs ?? index} bus={bus} now={now} primary={index === 0} />
        ))}
      </View>

      <View style={styles.serviceMeta}>
        {service.buses[0] && <BusFeatures bus={service.buses[0]} />}
        {service.operator.length > 0 && (
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {service.operator}
          </ThemedText>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  saveButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
  verdict: {
    gap: Spacing.one,
  },
  centre: {
    paddingVertical: Spacing.five,
    alignItems: 'center',
  },
  serviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  countdowns: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  serviceMeta: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 1,
  },
});
