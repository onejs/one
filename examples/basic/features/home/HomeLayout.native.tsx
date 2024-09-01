import { Tabs } from 'vxs'
import { ToggleThemeButton } from '../theme/ToggleThemeButton'
import { HomeIcons } from './HomeIcons'

export function HomeLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="(feed)"
        options={{
          title: 'Feed',
          tabBarIcon: () => <HomeIcons.Home size={20} />,
          headerRight() {
            return <ToggleThemeButton />
          },
        }}
      />

      <Tabs.Screen
        name="spa"
        options={{
          title: 'Profile',
          tabBarIcon: () => <HomeIcons.Notifications size={20} />,
        }}
      />

      <Tabs.Screen
        name="user/[user]"
        options={{
          title: 'Profile',
          tabBarIcon: () => <HomeIcons.User size={20} />,
        }}
      />
    </Tabs>
  )
}
