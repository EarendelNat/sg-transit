import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

/**
 * Four tabs, using SF Symbols on iOS and Material Symbols on Android so no
 * icon assets are needed. Android caps the native tab bar at five tabs.
 */
export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Nearby</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'location', selected: 'location.fill' }}
          md={{ default: 'near_me', selected: 'near_me' }}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="plan">
        <NativeTabs.Trigger.Label>Plan</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'map', selected: 'map.fill' }}
          md={{ default: 'directions', selected: 'directions' }}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="alerts">
        <NativeTabs.Trigger.Label>Alerts</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'exclamationmark.triangle', selected: 'exclamationmark.triangle.fill' }}
          md={{ default: 'warning', selected: 'warning' }}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="favourites">
        <NativeTabs.Trigger.Label>Saved</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'star', selected: 'star.fill' }}
          md={{ default: 'star', selected: 'star' }}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
