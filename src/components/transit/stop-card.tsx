/**
 * One bus stop with its live arrivals — the main repeated unit on the Nearby
 * and Favourites screens.
 */

import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import type { NearbyStop, ServiceArrivals } from '@/api/types';
import { BusFeatures, Chip, Countdown } from '@/components/transit/arrival-pieces';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDistance } from '@/lib/geo';

export type StopCardProps = {
  stop: NearbyStop | (Omit<NearbyStop, 'distanceMetres'> & { distanceMetres?: number });
  services: ServiceArrivals[];
  now: number;
  /** Caps the visible services so a busy interchange does not fill the screen. */
  maxServices?: number;
  loading?: boolean;
};

export function StopCard({ stop, services, now, maxServices = 4, loading }: StopCardProps) {
  const theme = useTheme();
  const shown = services.slice(0, maxServices);
  const hidden = services.length - shown.length;

  return (
    <Link href={{ pathname: '/stop/[code]', params: { code: stop.code } }} asChild>
      <Pressable
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${stop.description}, ${services.length} services`}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <ThemedText type="smallBold" numberOfLines={1}>
              {stop.description}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }} numberOfLines={1}>
              {stop.roadName} · {stop.code}
            </ThemedText>
          </View>

          {stop.distanceMetres !== undefined && (
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {formatDistance(stop.distanceMetres)}
            </ThemedText>
          )}
        </View>

        {shown.length === 0 ? (
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {loading ? 'Loading arrivals…' : 'No buses running right now'}
          </ThemedText>
        ) : (
          <View style={styles.services}>
            {shown.map((service) => (
              <View key={service.serviceNo} style={styles.serviceRow}>
                <Chip label={service.serviceNo} color={theme.text} />

                <View style={styles.countdowns}>
                  {service.buses.slice(0, 3).map((bus, index) => (
                    <Countdown
                      key={bus.arrivalMs ?? index}
                      bus={bus}
                      now={now}
                      primary={index === 0}
                    />
                  ))}
                </View>

                <View style={styles.features}>
                  {service.buses[0] && <BusFeatures bus={service.buses[0]} />}
                </View>
              </View>
            ))}

            {hidden > 0 && (
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                +{hidden} more service{hidden === 1 ? '' : 's'}
              </ThemedText>
            )}
          </View>
        )}
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  headerText: {
    flex: 1,
    gap: 1,
  },
  services: {
    gap: Spacing.two,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  countdowns: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  features: {
    flex: 1,
    alignItems: 'flex-end',
  },
});
