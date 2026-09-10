/**
 * Foreground GPS position.
 *
 * Deliberately foreground-only: background location would require a custom dev
 * client (Expo Go cannot grant it) plus store-review justification, so the
 * "leave now" notification idea is a later phase. See the README.
 */

import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { LatLng } from '@/lib/geo';

export type LocationState = {
  position: LatLng | null;
  /** Accuracy radius in metres, useful for warning about a poor fix. */
  accuracyMetres: number | null;
  status: 'idle' | 'requesting' | 'granted' | 'denied' | 'error';
  error: string | null;
  /** Re-asks for permission, for use after the user enables it in Settings. */
  retry: () => void;
};

/**
 * @param watch When true, subscribes to continuous updates so the
 *   "can I make it?" verdict re-evaluates as the user walks.
 */
export function useLocation(watch = true): LocationState {
  const [position, setPosition] = useState<LatLng | null>(null);
  const [accuracyMetres, setAccuracy] = useState<number | null>(null);
  const [status, setStatus] = useState<LocationState['status']>('idle');
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const subscription = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      setStatus('requesting');
      setError(null);

      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;

        if (!permission.granted) {
          setStatus('denied');
          setError(
            permission.canAskAgain
              ? 'Location permission is needed to find stops near you.'
              : 'Location is blocked. Enable it for this app in your device settings.',
          );
          return;
        }

        setStatus('granted');

        // One immediate reading so the UI is not empty while the watch warms up.
        const first = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (cancelled) return;

        setPosition({ lat: first.coords.latitude, lng: first.coords.longitude });
        setAccuracy(first.coords.accuracy ?? null);

        if (!watch) return;

        subscription.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            // Walking pace: a reading every few seconds or every 10 m is plenty,
            // and keeps the GPS from draining the battery.
            timeInterval: 5000,
            distanceInterval: 10,
          },
          (update) => {
            setPosition({ lat: update.coords.latitude, lng: update.coords.longitude });
            setAccuracy(update.coords.accuracy ?? null);
          },
        );
      } catch (cause) {
        if (cancelled) return;
        setStatus('error');
        setError(cause instanceof Error ? cause.message : 'Could not read your location.');
      }
    }

    void start();

    return () => {
      cancelled = true;
      subscription.current?.remove();
      subscription.current = null;
    };
  }, [watch, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { position, accuracyMetres, status, error, retry };
}
