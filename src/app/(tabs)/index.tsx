/**
 * Nearby — bus stops around you, with live arrivals.
 *
 * This is the screen you open while already walking, so it prioritises getting
 * *something* on screen fast: the stop list appears as soon as GPS resolves,
 * and each stop's arrivals fill in independently rather than waiting for all.
 */

import { useQueries, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { getBusArrivals } from '@/api/lta';
import type { ServiceArrivals } from '@/api/types';
import { ThemedText } from '@/components/themed-text';
import { InfoBox, MockNotice, Screen, ScreenTitle } from '@/components/transit/screen';
import { StopCard } from '@/components/transit/stop-card';
import { ARRIVAL_POLL_MS, USE_MOCK_LTA } from '@/config';
import { Spacing } from '@/constants/theme';
import { useLocation } from '@/hooks/use-location';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { getBusStops, nearestStops } from '@/lib/busStopDb';

/** Central Singapore, used only to show something while GPS is resolving. */
const FALLBACK_ORIGIN = { lat: 1.29821, lng: 103.85549 };

export default function NearbyScreen() {
  const theme = useTheme();
  const now = useNow();
  const { position, accuracyMetres, status, error, retry } = useLocation(true);

  // The stop database is fetched once and cached on the device for a month.
  const stopsQuery = useQuery({
    queryKey: ['bus-stops'],
    queryFn: getBusStops,
    staleTime: Infinity,
  });

  const origin = position ?? FALLBACK_ORIGIN;
  const usingFallback = position === null;

  // Recomputed only when the user has actually moved a meaningful distance,
  // otherwise every GPS jitter would reshuffle the list under their thumb.
  const coarseKey = `${origin.lat.toFixed(3)},${origin.lng.toFixed(3)}`;
  const nearby = useMemo(
    () => (stopsQuery.data ? nearestStops(stopsQuery.data, origin, 8) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stopsQuery.data, coarseKey],
  );

  const arrivalQueries = useQueries({
    queries: nearby.map((stop) => ({
      queryKey: ['arrivals', stop.code],
      queryFn: () => getBusArrivals(stop.code),
      refetchInterval: ARRIVAL_POLL_MS,
    })),
  });

  const refreshing = arrivalQueries.some((query) => query.isFetching);
  const refetchAll = () => arrivalQueries.forEach((query) => void query.refetch());

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.header}>
        <ScreenTitle
          title="Nearby"
          subtitle={
            usingFallback
              ? 'Waiting for your location…'
              : `Stops within 1.2 km${
                  accuracyMetres !== null ? ` · GPS ±${Math.round(accuracyMetres)} m` : ''
                }`
          }
        />

        <Pressable
          onPress={refetchAll}
          accessibilityRole="button"
          accessibilityLabel="Refresh arrivals"
          style={({ pressed }) => [
            styles.refresh,
            { backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement },
          ]}>
          {refreshing ? (
            <ActivityIndicator size="small" color={theme.textSecondary} />
          ) : (
            <ThemedText type="small">Refresh</ThemedText>
          )}
        </Pressable>
      </View>

      {USE_MOCK_LTA && <MockNotice what="Bus arrivals" />}

      {(status === 'denied' || status === 'error') && (
        <InfoBox title="Location unavailable" tone="warning">
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {error ?? 'Could not read your location.'}
          </ThemedText>
          <Pressable onPress={retry} accessibilityRole="button">
            <ThemedText type="linkPrimary">Try again</ThemedText>
          </Pressable>
        </InfoBox>
      )}

      {stopsQuery.isError && (
        <InfoBox title="Could not load bus stops" tone="warning">
          {stopsQuery.error instanceof Error
            ? stopsQuery.error.message
            : 'The bus stop database could not be downloaded.'}
        </InfoBox>
      )}

      {stopsQuery.isLoading && (
        <View style={styles.centre}>
          <ActivityIndicator color={theme.textSecondary} />
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Loading the bus stop database…
          </ThemedText>
        </View>
      )}

      {stopsQuery.data && nearby.length === 0 && (
        <InfoBox title="No stops nearby">
          There are no bus stops within 1.2 km of here. If you are outside
          Singapore, the Plan tab still works for trying out journeys.
        </InfoBox>
      )}

      {nearby.map((stop, index) => {
        const query = arrivalQueries[index];

        return (
          <StopCard
            key={stop.code}
            stop={stop}
            services={(query?.data ?? []) as ServiceArrivals[]}
            now={now}
            loading={query?.isLoading ?? true}
          />
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: Spacing.six,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  refresh: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
    minWidth: 76,
    alignItems: 'center',
  },
  centre: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.five,
  },
});
