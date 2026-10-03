import { Tabs } from 'one'
import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs'
import { DoubleBarAccessory } from '../../fixtures/bars-double-bar'

const screenOptions = {
  bottomAccessory: ({ placement }) => <DoubleBarAccessory placement={placement} />,
  headerShown: false,
  tabBarMinimizeBehavior: 'onScrollDown',
} satisfies BottomTabNavigationOptions

export default function DoubleBarLayout() {
  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Feed',
          tabBarButtonTestID: 'bars-double-tab-feed',
          tabBarIcon: { type: 'sfSymbol', name: 'list.bullet' },
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: 'Saved',
          tabBarButtonTestID: 'bars-double-tab-saved',
          tabBarIcon: { type: 'sfSymbol', name: 'bookmark' },
        }}
      />
    </Tabs>
  )
}
