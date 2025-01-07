import { useTheme } from 'tamagui'
import { NativeTabs } from '~/code/ui/BottomTabs.native'

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
        name="index"
        options={{
          title: 'Feed',
          tabBarIcon: () => ({ sfSymbol: 'person' }),
        }}
      />

      <NativeTabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          tabBarIcon: () => ({ sfSymbol: 'person' }),
        }}
      />

      <NativeTabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: () => ({ sfSymbol: 'person' }),
        }}
      />
    </NativeTabs>
  )
}
