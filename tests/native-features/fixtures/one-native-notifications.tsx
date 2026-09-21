import {
  AndroidImportance,
  deleteNotificationChannelAsync,
  getBadgeCountAsync,
  getNotificationChannelAsync,
  getNotificationChannelsAsync,
  getPermissionsAsync,
  requestPermissionsAsync,
  setBadgeCountAsync,
  setNotificationChannelAsync,
} from '@vxrn/native/notifications'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native'

// exercises @vxrn/native/notifications slice by slice. readings travel as
// labels because RN Text testIDs vanish from the accessibility snapshot
// while Pressable IDs survive.
function show(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

const testChannel = { name: 'Test Channel', importance: AndroidImportance.DEFAULT }

export default function OneNativeNotifications() {
  const [permission, setPermission] = useState('Permission: unknown')
  const [badge, setBadge] = useState('Badge: unknown')
  const [channel, setChannel] = useState('Channel: unknown')
  const [channels, setChannels] = useState('Channels: unknown')

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
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
      <Text>{channel}</Text>
      <Pressable
        testID="one-native-notifications-channel-create"
        style={styles.chip}
        onPress={() =>
          setNotificationChannelAsync('test-channel', testChannel).then(
            (created) =>
              setChannel(
                created ? `Channel: ${created.name}/${created.importance}` : 'Channel: null'
              ),
            (error) => setChannel(`Channel: error ${show(error)}`)
          )
        }
      >
        <Text>Create channel</Text>
      </Pressable>
      <Pressable
        testID="one-native-notifications-channel-get"
        style={styles.chip}
        onPress={() =>
          getNotificationChannelAsync('test-channel').then(
            (found) =>
              setChannel(
                found ? `Channel: ${found.name}/${found.importance}` : 'Channel: null'
              ),
            (error) => setChannel(`Channel: error ${show(error)}`)
          )
        }
      >
        <Text>Get channel</Text>
      </Pressable>
      <Pressable
        testID="one-native-notifications-channel-delete"
        style={styles.chip}
        onPress={() =>
          deleteNotificationChannelAsync('test-channel').then(
            () => setChannel('Channel: deleted'),
            (error) => setChannel(`Channel: error ${show(error)}`)
          )
        }
      >
        <Text>Delete channel</Text>
      </Pressable>
      <Text>{channels}</Text>
      <Pressable
        testID="one-native-notifications-channel-list"
        style={styles.chip}
        onPress={() =>
          getNotificationChannelsAsync().then(
            (list) => setChannels(`Channels: ${list.length}`),
            (error) => setChannels(`Channels: error ${show(error)}`)
          )
        }
      >
        <Text>List channels</Text>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, gap: 8 },
  chip: { padding: 12, backgroundColor: '#eee', borderRadius: 8 },
})
