import { Tabs, TabList, TabTrigger, TabSlot, TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { MaxContentWidth, Spacing } from '@/constants/theme';

/**
 * Web tab bar. Native tabs only render a rough fallback on web, and the web
 * build is the fastest way to iterate on the app, so it gets a real tab bar.
 */
export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={styles.slot} />

      <TabList asChild>
        <TabBar>
          <TabTrigger name="index" href="/" asChild>
            <TabButton>Nearby</TabButton>
          </TabTrigger>
          <TabTrigger name="plan" href="/plan" asChild>
            <TabButton>Plan</TabButton>
          </TabTrigger>
          <TabTrigger name="alerts" href="/alerts" asChild>
            <TabButton>Alerts</TabButton>
          </TabTrigger>
          <TabTrigger name="favourites" href="/favourites" asChild>
            <TabButton>Saved</TabButton>
          </TabTrigger>
        </TabBar>
      </TabList>
    </Tabs>
  );
}

function TabButton({ children, isFocused, ...props }: TabTriggerSlotProps) {
  return (
    <Pressable {...props} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView
        type={isFocused ? 'backgroundSelected' : 'backgroundElement'}
        style={styles.tabButton}>
        <ThemedText type="small" themeColor={isFocused ? 'text' : 'textSecondary'}>
          {children}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

function TabBar(props: { children?: React.ReactNode }) {
  return (
    <View {...props} style={styles.barContainer}>
      <ThemedView type="backgroundElement" style={styles.bar}>
        <ThemedText type="smallBold" style={styles.brand}>
          SG Transit
        </ThemedText>
        {props.children}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    height: '100%',
  },
  barContainer: {
    position: 'absolute',
    width: '100%',
    padding: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  bar: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.five,
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 1,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
  },
  brand: {
    marginRight: 'auto',
  },
  pressed: {
    opacity: 0.7,
  },
  tabButton: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
});
