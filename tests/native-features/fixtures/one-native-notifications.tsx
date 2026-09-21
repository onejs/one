import {
  getBadgeCountAsync,
  getPermissionsAsync,
  requestPermissionsAsync,
  setBadgeCountAsync,
} from '@vxrn/native/notifications'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'

// exercises @vxrn/native/notifications slice by slice. readings travel as
// labels because RN Text testIDs vanish from the accessibility snapshot
// while Pressable IDs survive.
function show(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

export default function OneNativeNotifications() {
  const [permission, setPermission] = useState('Permission: unknown')
  const [badge, setBadge] = useState('Badge: unknown')

  return (
    <View style={styles.screen}>
      <Text>Notifications: mounted</Text>
      <Text>{permission}</Text>
      <Pressable
        testID="one-native-notifications-permission-refresh"
        style={styles.chip}
        onPress={() =>
          getPermissionsAsync().then(
            (result) =>
              setPermission(
                `Permission: ${result.status} ask:${result.canAskAgain ? 'yes' : 'no'}`
              ),
            (error) => setPermission(`Permission: error ${show(error)}`)
          )
        }
      >
        <Text>Refresh permission</Text>
      </Pressable>
      <Pressable
        testID="one-native-notifications-permission-request"
        style={styles.chip}
        onPress={() =>
          requestPermissionsAsync().then(
            (result) =>
              setPermission(
                `Permission: ${result.status} ask:${result.canAskAgain ? 'yes' : 'no'}`
              ),
            (error) => setPermission(`Permission: error ${show(error)}`)
          )
        }
      >
        <Text>Request permission</Text>
      </Pressable>
      <Text>{badge}</Text>
      <Pressable
        testID="one-native-notifications-badge-get"
        style={styles.chip}
        onPress={() =>
          getBadgeCountAsync().then(
            (count) => setBadge(`Badge: ${count}`),
            (error) => setBadge(`Badge: error ${show(error)}`)
          )
        }
      >
        <Text>Get badge</Text>
      </Pressable>
      <Pressable
        testID="one-native-notifications-badge-set"
        style={styles.chip}
        onPress={() =>
          setBadgeCountAsync(5).then(
            (ok) => setBadge(`Badge: set:${ok ? 'yes' : 'no'}`),
            (error) => setBadge(`Badge: error ${show(error)}`)
          )
        }
      >
        <Text>Set badge to 5</Text>
      </Pressable>
      <Pressable
        testID="one-native-notifications-badge-clear"
        style={styles.chip}
        onPress={() =>
          setBadgeCountAsync(0).then(
            (ok) => setBadge(`Badge: set:${ok ? 'yes' : 'no'}`),
            (error) => setBadge(`Badge: error ${show(error)}`)
          )
        }
      >
        <Text>Clear badge</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 8 },
  chip: { padding: 12, backgroundColor: '#eee', borderRadius: 8 },
})
