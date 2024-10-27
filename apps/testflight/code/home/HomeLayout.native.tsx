import { NativeTabs } from '../layouts/BottomTabs'
import { HomeIcons } from './HomeIcons'

export function HomeLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Screen
        name="index"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color }) => <HomeIcons.Home size={20} color={color} />,
        }}
      />

      <NativeTabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          tabBarIcon: ({ color }) => <HomeIcons.Notifications size={20} color={color} />,
        }}
      />

      <NativeTabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <HomeIcons.User size={20} color={color} />,
        }}
      />
    </NativeTabs>
  )
}
