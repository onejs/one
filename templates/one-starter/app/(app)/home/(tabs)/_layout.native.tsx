import { Tabs } from 'one'
export function TabsLayout() {
  return (
    <Tabs
      initialRouteName="feed"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="feed" />
    </Tabs>
  )
}
