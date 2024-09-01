import { Tabs } from 'vxs'
import { ToggleThemeButton } from '../theme/ToggleThemeButton'
import { HomeIcons } from './HomeIcons'
import { View } from 'tamagui'

export function HomeLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="(feed)"
        options={{
          title: 'Feed',
          tabBarIcon: () => <HomeIcons.Home size={20} />,
          headerRight() {
            return (
              <View px="$4">
                <ToggleThemeButton />
              </View>
            )
          },
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
