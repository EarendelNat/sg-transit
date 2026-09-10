/**
 * Alerts — MRT disruptions and platform crowding.
 *
 * This is the closest thing to "live MRT tracking" that exists: Singapore
 * publishes no real-time train arrival or train-position feed, so what we can
 * show is whether the line is broken and how packed the platform is.
 */

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { getStationCrowd, getTrainAlerts, TRAIN_LINES, type TrainLine } from '@/api/lta';
import { ThemedText } from '@/components/themed-text';
import { InfoBox, MockNotice, Screen, ScreenTitle } from '@/components/transit/screen';
import { USE_MOCK_LTA } from '@/config';
import { Spacing } from '@/constants/theme';
import { Crowd, LineColors } from '@/constants/transit';
import { useTheme } from '@/hooks/use-theme';

/** Human names for the line codes the crowd density endpoint accepts. */
const LINE_NAMES: Record<TrainLine, string> = {
  NSL: 'North South',
  EWL: 'East West',
  CGL: 'Changi Airport',
  CCL: 'Circle',
  DTL: 'Downtown',
  NEL: 'North East',
  BPL: 'Bukit Panjang LRT',
  SLRT: 'Sengkang LRT',
  PLRT: 'Punggol LRT',
  TEL: 'Thomson-East Coast',
};

export default function AlertsScreen() {
  const theme = useTheme();
  const [line, setLine] = useState<TrainLine>('NSL');

  const alerts = useQuery({
    queryKey: ['train-alerts'],
    queryFn: getTrainAlerts,
    // Disruptions are the one thing worth polling reasonably often.
    refetchInterval: 60_000,
  });

  const crowd = useQuery({
    queryKey: ['crowd', line],
    queryFn: () => getStationCrowd(line),
    // LTA only recomputes crowding every 10 minutes.
    staleTime: 10 * 60 * 1000,
  });

  return (
    <Screen>
      <ScreenTitle title="Alerts" subtitle="Train disruptions and platform crowding" />

      {USE_MOCK_LTA && <MockNotice what="Alerts" />}

      {alerts.isLoading && (
        <View style={styles.centre}>
          <ActivityIndicator color={theme.textSecondary} />
        </View>
      )}

      {alerts.isError && (
        <InfoBox title="Could not load alerts" tone="warning">
          {alerts.error instanceof Error ? alerts.error.message : 'Request failed.'}
        </InfoBox>
      )}

      {alerts.data?.normal && (
        <View style={[styles.banner, { backgroundColor: '#e6f4ea' }]}>
          <ThemedText type="smallBold" style={{ color: '#0d652d' }}>
            ✓ All train lines running normally
          </ThemedText>
        </View>
      )}

      {alerts.data && !alerts.data.normal && (
        <View style={[styles.banner, { backgroundColor: '#fce8e6' }]}>
          <ThemedText type="smallBold" style={{ color: '#a50e0e' }}>
            ✕ Service disruption
          </ThemedText>

          {alerts.data.affectedLines.length > 0 && (
            <ThemedText type="small" style={{ color: '#a50e0e' }}>
              {`Affected: ${alerts.data.affectedLines.join(', ')}`}
            </ThemedText>
          )}

          {alerts.data.messages.map((message, index) => (
            <ThemedText key={index} type="small" style={{ color: '#a50e0e' }}>
              {message}
            </ThemedText>
          ))}
        </View>
      )}

      <InfoBox title="Why there are no live train times">
        Buses broadcast their GPS position, so their arrival times here are real.
        Trains do not — LTA publishes no real-time train arrival feed, so MRT
        times in the Plan tab are from the timetable. Crowding below is live.
      </InfoBox>

      <ThemedText type="smallBold">Platform crowding</ThemedText>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.lineRow}>
        {TRAIN_LINES.map((candidate) => {
          const active = candidate === line;

          return (
            <Pressable
              key={candidate}
              onPress={() => setLine(candidate)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[
                styles.linePill,
                {
                  backgroundColor: active
                    ? (LineColors[candidate.slice(0, 2)] ?? theme.text)
                    : theme.backgroundElement,
                },
              ]}>
              <ThemedText
                type="small"
                style={{ color: active ? '#fff' : theme.textSecondary }}>
                {candidate}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>

      <ThemedText type="small" style={{ color: theme.textSecondary }}>
        {LINE_NAMES[line]} Line
      </ThemedText>

      {crowd.isLoading && <ActivityIndicator color={theme.textSecondary} />}

      {crowd.isError && (
        <InfoBox title="Could not load crowding" tone="warning">
          {crowd.error instanceof Error ? crowd.error.message : 'Request failed.'}
        </InfoBox>
      )}

      {crowd.data?.length === 0 && (
        <InfoBox title="No crowding data">
          LTA is not reporting crowd levels for this line right now.
        </InfoBox>
      )}

      <View style={styles.crowdGrid}>
        {(crowd.data ?? []).map((station) => {
          const level = Crowd[station.level];

          return (
            <View
              key={station.stationCode}
              style={[styles.crowdCell, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="smallBold">{station.stationCode}</ThemedText>
              <View style={styles.crowdRow}>
                <View style={[styles.crowdDot, { backgroundColor: level.color }]} />
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  {level.label}
                </ThemedText>
              </View>
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centre: {
    paddingVertical: Spacing.four,
    alignItems: 'center',
  },
  banner: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    gap: 3,
  },
  lineRow: {
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  linePill: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
  crowdGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  crowdCell: {
    borderRadius: Spacing.two,
    padding: Spacing.two,
    minWidth: 104,
    gap: 3,
  },
  crowdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  crowdDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
