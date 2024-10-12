import { Tabs } from 'one'
import { HomeIcons } from './HomeIcons'
import { useTheme } from 'tamagui'

export function HomeLayout() {
  const theme = useTheme()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.accentColor.val,
        tabBarInactiveTintColor: theme.gray9.val,
      }}
    >
      <Tabs.Screen
        name="(photos)"
        options={{
          title: 'Photos',
          tabBarIcon: ({ color }) => <HomeIcons.Home size={20} color={color} />,
        }}
      />

      <Tabs.Screen
        name="upload"
        options={{
          title: 'Upload',
          tabBarIcon: ({ color }) => <HomeIcons.Camera size={20} color={color} />,
        }}
      />
    </Tabs>
  )
}
