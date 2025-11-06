import { Tabs, TabList, TabTrigger, TabSlot } from 'one/ui'
import { View, Text, Pressable, StyleSheet } from 'react-native'

export default function TabsLayout() {
  return (
    <Tabs style={styles.container}>
      <TabSlot />
      <TabList style={styles.tabBar}>
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
    <Pressable
      {...props}
      style={[styles.tab, isFocused && styles.tabActive]}
    >
      <Text style={[styles.tabText, isFocused && styles.tabTextActive]}>
        {children}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingVertical: 8,
  },
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
