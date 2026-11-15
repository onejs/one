import { Tabs } from 'one'

export default function Layout() {
  return <Tabs screenOptions={{ tabBarPosition: 'left' }}>
    <Tabs.Screen name="index" options={{ title: 'Library' }} />
    <Tabs.Screen name="places" options={{ title: 'Places' }} />
  </Tabs>
}
