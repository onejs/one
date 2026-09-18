import { Tabs } from 'one'
import { Platform } from 'react-native'

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: Platform.select({
            ios: { type: 'sfSymbol', name: 'house' },
            android: { type: 'materialSymbol', name: 'home' },
          }),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: Platform.select({
            ios: { type: 'sfSymbol', name: 'person' },
            android: { type: 'materialSymbol', name: 'person' },
          }),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: Platform.select({
            ios: { type: 'sfSymbol', name: 'gearshape' },
            android: { type: 'materialSymbol', name: 'settings' },
          }),
        }}
      />
    </Tabs>
  )
}
