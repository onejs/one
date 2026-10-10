import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

export default function OneNativeTabSidebar() {
  const [selection, setSelection] = useState('home')
  const [sidebarTaps, setSidebarTaps] = useState('none')

  return (
    <View style={styles.screen} testID="one-native-tab-sidebar-screen">
      <Text>{`Selected tab: ${selection}`}</Text>
      <Text>{`Sidebar taps: ${sidebarTaps}`}</Text>
      <One.iOS.Tabs
        selection={selection}
        onSelectionChange={setSelection}
        tabViewStyle="sidebarAdaptable"
        style={{ flex: 1 }}
        testID="one-native-tab-sidebar-tabs"
      >
        <One.iOS.Tab id="home" title="Home" systemImage="house">
          <View style={styles.page}><Text>Home page</Text></View>
        </One.iOS.Tab>
        <One.iOS.Tab id="other" title="Other" systemImage="star">
          <View style={styles.page}><Text>Other page</Text></View>
        </One.iOS.Tab>
        <One.iOS.TabViewSlot name="tabViewSidebarHeader" height={44}>
          <Pressable style={styles.slot} testID="one-native-tab-slot-sidebar-header" onPress={() => setSidebarTaps('header')}>
            <Text>Sidebar header</Text>
          </Pressable>
        </One.iOS.TabViewSlot>
        <One.iOS.TabViewSlot name="tabViewSidebarFooter" height={48}>
          <Pressable style={styles.slot} testID="one-native-tab-slot-sidebar-footer" onPress={() => setSidebarTaps('footer')}>
            <Text>Sidebar footer</Text>
          </Pressable>
        </One.iOS.TabViewSlot>
        <One.iOS.TabViewSlot name="tabViewSidebarBottomBar" height={52}>
          <Pressable style={styles.slot} testID="one-native-tab-slot-sidebar-bottom-bar" onPress={() => setSidebarTaps('bottom bar')}>
            <Text>Sidebar bottom bar</Text>
          </Pressable>
        </One.iOS.TabViewSlot>
      </One.iOS.Tabs>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingTop: 70, backgroundColor: '#F5F5F7' },
  page: { flex: 1, padding: 16 },
  slot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
})
