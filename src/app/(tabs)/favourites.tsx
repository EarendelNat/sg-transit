/**
 * Saved — stops the user pinned, with live arrivals.
 *
 * Reloads on focus rather than on mount, because a stop may have been saved or
 * unsaved on the stop detail screen since this tab was last shown.
 */

import { useQueries, useQuery } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import type { ServiceArrivals } from '@/api/types';
import { getBusArrivals } from '@/api/lta';
import { InfoBox, MockNotice, Screen, ScreenTitle } from '@/components/transit/screen';
import { StopCard } from '@/components/transit/stop-card';
import { ARRIVAL_POLL_MS, USE_MOCK_LTA } from '@/config';
import { Spacing } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { getBusStops } from '@/lib/busStopDb';
import { getFavourites } from '@/lib/favourites';

export default function FavouritesScreen() {
  const theme = useTheme();
  const now = useNow();
  const [codes, setCodes] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      void getFavourites().then(setCodes);
    }, []),
  );

  const stopsQuery = useQuery({
    queryKey: ['bus-stops'],
    queryFn: getBusStops,
    staleTime: Infinity,
  });

  const stops = codes
    .map((code) => stopsQuery.data?.find((candidate) => candidate.code === code))
    .filter((stop): stop is NonNullable<typeof stop> => stop !== undefined);

  const arrivalQueries = useQueries({
    queries: stops.map((stop) => ({
      queryKey: ['arrivals', stop.code],
      queryFn: () => getBusArrivals(stop.code),
      refetchInterval: ARRIVAL_POLL_MS,
    })),
  });

  return (
    <Screen>
      <ScreenTitle title="Saved" subtitle="Your pinned stops" />

      {USE_MOCK_LTA && codes.length > 0 && <MockNotice what="Saved stops" />}

      {stopsQuery.isLoading && (
        <View style={styles.centre}>
          <ActivityIndicator color={theme.textSecondary} />
        </View>
      )}

      {codes.length === 0 && (
        <InfoBox title="Nothing saved yet">
          Open a stop from the Nearby tab and tap Save to pin it here. Handy for
          the stop outside your home and the one by the office.
        </InfoBox>
      )}

      {stops.map((stop, index) => {
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
  centre: {
    paddingVertical: Spacing.five,
    alignItems: 'center',
  },
});
