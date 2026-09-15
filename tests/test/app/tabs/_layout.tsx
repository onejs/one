// @ts-expect-error the universal typecheck resolves native conditions; this file is web-only
import { Tabs, TabList, TabSlot, TabTrigger } from 'one/ui'
import { Text } from 'react-native'

export default function TabsLayout() {
  return (
    <Tabs style={{ display: 'flex', flex: 1 }}>
      <TabSlot />
      <TabList
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-around',
          padding: 10,
        }}
      >
        <TabTrigger name="home" href="/tabs">
          <Text>Home</Text>
        </TabTrigger>
        <TabTrigger name="other" href="/tabs/other">
          <Text>Other</Text>
        </TabTrigger>
      </TabList>
    </Tabs>
  )
}
