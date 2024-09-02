import { Tabs } from 'vxs'
import { HomeIcons } from './HomeIcons'

export function HomeLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="(feed)"
        options={{
          title: 'Feed',
          tabBarIcon: () => <HomeIcons.Home size={20} />,
        }}
      />

      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          tabBarIcon: () => <HomeIcons.Notifications size={20} />,
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: () => <HomeIcons.User size={20} />,
        }}
      />
    </Tabs>
  )
}
