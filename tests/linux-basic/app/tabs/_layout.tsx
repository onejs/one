import { Tabs } from 'one'
import { useShell } from '../../probe/shell'

export default function Layout() {
  const { blocked, countTabPress } = useShell()
  return <Tabs screenListeners={{ tabPress: countTabPress }}>
    <Tabs.Screen name="index" options={{ title: 'Home' }} />
    <Tabs.Screen name="settings" options={{ title: 'Settings' }} listeners={{ tabPress: (event) => { if (blocked) event.preventDefault() } }} />
  </Tabs>
}
