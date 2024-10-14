import { NativeTabs } from '../layouts/BottomTabs'
import { HomeIcons } from './HomeIcons'
import { useTheme } from 'tamagui'

export function HomeLayout() {
  const theme = useTheme()

  return (
    <NativeTabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.accentColor.val,
        tabBarInactiveTintColor: theme.gray9.val,
      }}
    >
      <NativeTabs.Screen
        name="(feed)"
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
