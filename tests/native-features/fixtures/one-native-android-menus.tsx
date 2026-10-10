import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

const menuItems = [
  { type: 'action', id: 'save', title: 'Menu Save' },
  { type: 'action', id: 'duplicate', title: 'Menu Duplicate' },
] as const

const contextItems = [
  { type: 'action', id: 'open', title: 'Context Open' },
  { type: 'action', id: 'delete', title: 'Context Delete' },
] as const

const disabledMenuItems = [
  { type: 'action', id: 'disabled-menu', title: 'Disabled Menu action' },
] as const

const disabledContextItems = [
  { type: 'action', id: 'disabled-context', title: 'Disabled Context action' },
] as const

export default function OneNativeAndroidMenus() {
  const [menuAction, setMenuAction] = useState('none')
  const [contextAction, setContextAction] = useState('none')

  return (
    <View style={styles.screen} testID="one-native-android-menus-screen">
      <Text>{`Menu action: ${menuAction}`}</Text>
      <Text>{`Context action: ${contextAction}`}</Text>
      <One.Android.Menu
        accessibilityLabel="Actions menu"
        items={menuItems}
        onAction={setMenuAction}
        testID="one-native-android-menu-trigger"
      >
        <View style={styles.trigger}><Text>Tap for menu</Text></View>
      </One.Android.Menu>
      <One.Android.ContextMenu
        items={contextItems}
        onAction={setContextAction}
        testID="one-native-android-context-trigger"
      >
        <View style={styles.trigger}><Text>Hold for context menu</Text></View>
      </One.Android.ContextMenu>
      <One.Android.Menu
        accessibilityLabel="Disabled actions menu"
        disabled
        items={disabledMenuItems}
        onAction={() => setMenuAction('disabled')}
        testID="one-native-android-disabled-menu-trigger"
      >
        <View style={styles.trigger}><Text>Disabled menu</Text></View>
      </One.Android.Menu>
      <One.Android.ContextMenu
        disabled
        items={disabledContextItems}
        onAction={() => setContextAction('disabled')}
        testID="one-native-android-disabled-context-trigger"
      >
        <View style={styles.trigger}><Text>Disabled context menu</Text></View>
      </One.Android.ContextMenu>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 10 },
  trigger: { width: 240, minHeight: 46, justifyContent: 'center', paddingHorizontal: 12, backgroundColor: '#e3e3e8' },
})
