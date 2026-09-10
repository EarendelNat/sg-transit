/**
 * Route detail — the chosen journey drawn on the map, leg by leg, with a live
 * "can I make it to the first bus?" verdict at the top.
 */

import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { JourneyLeg } from '@/api/types';
import { ThemedText } from '@/components/themed-text';
import { Chip, VerdictBanner } from '@/components/transit/arrival-pieces';
import { InfoBox, Screen, ScreenTitle } from '@/components/transit/screen';
import { Spacing } from '@/constants/theme';
import { legColor, modeLabel } from '@/constants/transit';
import { useLocation } from '@/hooks/use-location';
import { useMakeItVerdict } from '@/hooks/use-make-it-verdict';
import { useTheme } from '@/hooks/use-theme';
import { formatDistance } from '@/lib/geo';
import { getPlannedJourney } from '@/lib/journeyStore';
import { formatDuration, formatSgTime } from '@/lib/time';
import { LeafletMap, type MapLine, type MapMarker } from '@/map/LeafletMap';

export default function RouteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { position } = useLocation(true);

  const planned = getPlannedJourney(id ?? '');

  // The first bus leg is the one you have to physically catch, so it is what
  // the verdict is about. Train legs have no live data to judge against.
  const firstBusLeg = planned?.journey.legs.find(
    (leg) => leg.mode === 'BUS' && leg.from.stopCode !== null,
  );

  const makeIt = useMakeItVerdict({
    stopCode: firstBusLeg?.from.stopCode ?? null,
    stopPoint: firstBusLeg ? { lat: firstBusLeg.from.lat, lng: firstBusLeg.from.lng } : null,
    serviceNo: firstBusLeg?.routeName ?? null,
    from: position,
  });

  const { lines, markers } = useMemo(() => {
    if (!planned) return { lines: [] as MapLine[], markers: [] as MapMarker[] };

    const mapLines: MapLine[] = planned.journey.legs
      .filter((leg) => leg.path.length >= 2)
      .map((leg) => ({
        points: leg.path,
        color: legColor(leg.mode, leg.routeName),
        dashed: leg.mode === 'WALK',
      }));

    const mapMarkers: MapMarker[] = planned.journey.legs
      .filter((leg) => leg.mode !== 'WALK')
      .map((leg, index) => ({
        id: String(index),
        lat: leg.from.lat,
        lng: leg.from.lng,
        label: String(index + 1),
        kind: leg.mode === 'BUS' ? ('bus' as const) : ('rail' as const),
        title: leg.from.name,
      }));

    const last = planned.journey.legs.at(-1);
    if (last) {
      mapMarkers.push({
        id: 'destination',
        lat: last.to.lat,
        lng: last.to.lng,
        label: '★',
        kind: 'stop',
        title: planned.trip.to.name,
      });
    }

    return { lines: mapLines, markers: mapMarkers };
  }, [planned]);

  if (!planned) {
    return (
      <Screen>
        <InfoBox title="Route no longer available">
          Journey details are kept only for the current session, so that a stale
          timetable is never shown as if it were current. Plan the journey again
          to see it.
        </InfoBox>
      </Screen>
    );
  }

  const { journey, trip } = planned;

  return (
    <Screen>
      <ScreenTitle
        title={formatDuration(journey.durationSec)}
        subtitle={`${trip.from.name} → ${trip.to.name}`}
      />

      <ThemedText type="small" style={{ color: theme.textSecondary }}>
        {`Depart ${formatSgTime(journey.startMs)} · arrive ${formatSgTime(journey.endMs)}`}
        {journey.fare ? ` · $${journey.fare}` : ''}
      </ThemedText>

      <LeafletMap me={position} lines={lines} markers={markers} fit style={styles.map} />

      {makeIt.verdict && (
        <View style={styles.verdict}>
          <VerdictBanner verdict={makeIt.verdict} />
          {makeIt.walkIsEstimated && (
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Walking time is a straight-line estimate; add OneMap credentials for
              routed walking directions.
            </ThemedText>
          )}
        </View>
      )}

      {!firstBusLeg && (
        <InfoBox title="No live tracking on this route">
          This journey has no bus legs. Singapore publishes no real-time train
          data, so MRT times below are scheduled estimates.
        </InfoBox>
      )}

      <View style={styles.legs}>
        {journey.legs.map((leg, index) => (
          <LegRow key={index} leg={leg} index={index} />
        ))}
      </View>
    </Screen>
  );
}

function LegRow({ leg, index }: { leg: JourneyLeg; index: number }) {
  const theme = useTheme();
  const color = legColor(leg.mode, leg.routeName);

  return (
    <View style={[styles.leg, { backgroundColor: theme.backgroundElement }]}>
      <View style={[styles.legRail, { backgroundColor: color }]} />

      <View style={styles.legBody}>
        <View style={styles.legHeader}>
          {leg.mode === 'WALK' ? (
            <ThemedText type="smallBold">Walk</ThemedText>
          ) : (
            <Chip label={leg.routeName ?? modeLabel(leg.mode)} color={color} />
          )}

          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {formatDuration(leg.durationSec)}
            {leg.mode === 'WALK' ? ` · ${formatDistance(leg.distanceMetres)}` : ''}
          </ThemedText>
        </View>

        <ThemedText type="small">
          {leg.mode === 'WALK' ? `To ${leg.to.name}` : `${leg.from.name} → ${leg.to.name}`}
        </ThemedText>

        <ThemedText type="small" style={{ color: theme.textSecondary }}>
          {[
            `${formatSgTime(leg.startMs)}–${formatSgTime(leg.endMs)}`,
            leg.numStops !== null && leg.mode !== 'WALK'
              ? `${leg.numStops} stop${leg.numStops === 1 ? '' : 's'}`
              : null,
            // Be explicit rather than implying precision Singapore does not publish.
            leg.scheduledOnly ? 'scheduled time' : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </ThemedText>
      </View>

      <ThemedText type="small" style={{ color: theme.textSecondary }}>
        {index + 1}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    height: 280,
    borderRadius: Spacing.three,
  },
  verdict: {
    gap: Spacing.one,
  },
  legs: {
    gap: Spacing.two,
  },
  leg: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: Spacing.two,
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  legRail: {
    width: 4,
    borderRadius: 2,
  },
  legBody: {
    flex: 1,
    gap: 3,
  },
  legHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
});
