// @ts-expect-error the universal typecheck resolves native conditions; this file is web-only
import { Tabs, TabList, TabTrigger, TabSlot } from 'one/ui'
import { Text, Pressable, StyleSheet } from 'react-native'

export default function TabsLayout() {
  return (
    <Tabs style={{ display: 'flex', flex: 1 }}>
      <TabSlot />
      <TabList
        style={{
          display: 'flex',
          flexDirection: 'row',
          backgroundColor: '#f0f0f0',
          borderTop: '1px solid #e0e0e0',
          paddingBlock: 8,
        }}
      >
        <TabTrigger name="home" href="/tabs" asChild>
          <CustomTab>Home</CustomTab>
        </TabTrigger>
        <TabTrigger name="profile" href="/tabs/profile" asChild>
          <CustomTab>Profile</CustomTab>
        </TabTrigger>
        <TabTrigger name="settings" href="/tabs/settings" asChild>
          <CustomTab>Settings</CustomTab>
        </TabTrigger>
      </TabList>
    </Tabs>
  )
}

function CustomTab({ children, isFocused, ...props }: any) {
  return (
    <Pressable {...props} style={[styles.tab, isFocused && styles.tabActive]}>
      <Text style={[styles.tabText, isFocused && styles.tabTextActive]}>{children}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  tabTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
})
