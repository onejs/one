import { Tabs } from 'one'

export default function ProbeLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="main"
        options={{
          title: 'Main',
          tabBarButtonTestID: 'bars-probe-tab-main',
          tabBarIcon: { type: 'sfSymbol', name: 'star' },
        }}
      />
      <Tabs.Screen
        name="plain"
        options={{
          title: 'Plain',
          tabBarButtonTestID: 'bars-probe-tab-plain',
          tabBarIcon: { type: 'sfSymbol', name: 'circle' },
        }}
      />
    </Tabs>
  )
}
