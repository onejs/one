import { Tabs } from 'one'
import { Alert, Platform } from 'react-native'

export function HomeLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Feed',
          tabBarIcon: Platform.select({
            ios: { type: 'sfSymbol', name: 'newspaper' },
            android: { type: 'materialSymbol', name: 'newspaper' },
          }),
        }}
      />

      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          tabBarIcon: Platform.select({
            ios: { type: 'sfSymbol', name: 'bell' },
            android: { type: 'materialSymbol', name: 'notifications' },
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

      {Platform.OS === 'ios' ? (
        <Tabs.Screen
          name="native/index"
          options={{
            title: 'Native',
            tabBarIcon: { type: 'sfSymbol', name: 'wrench.and.screwdriver' },
            tabBarStyle: { display: 'none' },
          }}
        />
      ) : null}

      {Platform.OS === 'ios' && Platform.isPad ? (
        <Tabs.Screen
          name="split/index"
          options={{
            title: 'Split',
            tabBarIcon: { type: 'sfSymbol', name: 'sidebar.left' },
          }}
        />
      ) : null}

      <Tabs.Screen
        name="action"
        listeners={{
          tabPress: () => {
            Alert.alert('New post', 'The detached tab action fired.')
          },
        }}
        options={{
          title: 'New',
          tabBarSelectionEnabled: false,
          tabBarSystemItem: Platform.OS === 'ios' ? 'search' : undefined,
          tabBarIcon: Platform.select({
            ios: { type: 'sfSymbol', name: 'plus' },
            android: { type: 'materialSymbol', name: 'add' },
          }),
        }}
      />
    </Tabs>
  )
}
