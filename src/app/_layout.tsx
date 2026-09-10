import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { ARRIVAL_POLL_MS } from '@/config';

SplashScreen.preventAutoHideAsync();

/**
 * Live arrivals go stale within seconds, so they are refetched on an interval
 * by the screens that show them. Everything else (the stop database, geocoding)
 * is effectively static and cached for much longer.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: ARRIVAL_POLL_MS,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        {/* Also responsible for hiding the native splash screen. */}
        <AnimatedSplashOverlay />

        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="stop/[code]" options={{ title: 'Bus stop' }} />
          <Stack.Screen name="route/[id]" options={{ title: 'Route' }} />
        </Stack>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
