import { Tabs } from 'one'

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="other" options={{ title: 'Other' }} />
    </Tabs>
  )
}
