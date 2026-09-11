import { NativeTabs } from '~/code/ui/BottomTabs.native'

export function HomeLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Screen
        name="index"
        options={{
          title: 'Feed',
          tabBarIcon: { type: 'sfSymbol', name: 'newspaper' },
        }}
      />

      <NativeTabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          tabBarIcon: { type: 'sfSymbol', name: 'bell' },
        }}
      />

      <NativeTabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: { type: 'sfSymbol', name: 'person' },
        }}
      />
    </NativeTabs>
  )
}
