import { Tabs } from 'one'
export default function Layout() {
  return (
    <Tabs
      backBehavior="history"
      screenOptions={{ headerShown: false, keepMounted: true } as any}
    >
      <Tabs.Screen name="index" options={{ title: 'Counter' }} />
      <Tabs.Screen name="other" options={{ title: 'Other' }} />
    </Tabs>
  )
}
