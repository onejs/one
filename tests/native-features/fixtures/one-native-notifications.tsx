import {
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
  AndroidImportance,
  cancelAllScheduledNotificationsAsync,
  cancelScheduledNotificationAsync,
  clearLastNotificationResponse,
  deleteNotificationChannelAsync,
  dismissAllNotificationsAsync,
  dismissNotificationAsync,
  getAllScheduledNotificationsAsync,
  getBadgeCountAsync,
  getLastNotificationResponse,
  getNotificationChannelAsync,
  getNotificationChannelsAsync,
  getPermissionsAsync,
  getPresentedNotificationsAsync,
  requestPermissionsAsync,
  scheduleNotificationAsync,
  setBadgeCountAsync,
  setNotificationChannelAsync,
  setNotificationHandler,
} from '@vxrn/native/notifications'
import { useEffect, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native'

// exercises @vxrn/native/notifications slice by slice. readings travel as
// labels because RN Text testIDs vanish from the accessibility snapshot
// while Pressable IDs survive.
function show(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

const testChannel = { name: 'Test Channel', importance: AndroidImportance.DEFAULT }

function lastLabel() {
  const last = getLastNotificationResponse()
  if (!last) return 'Last: none'
  const title = last.notification.request.content.title || 'untitled'
  return `Last: ${last.notification.request.identifier}/${title}`
}

export default function OneNativeNotifications() {
  const [permission, setPermission] = useState('Permission: unknown')
  const [badge, setBadge] = useState('Badge: unknown')
  const [channel, setChannel] = useState('Channel: unknown')
  const [channels, setChannels] = useState('Channels: unknown')
  const [received, setReceived] = useState('Received: none')
  const [response, setResponse] = useState('Response: none')
  const [last, setLast] = useState('Last: none')
  const [handler, setHandlerName] = useState('Handler: default')
  const [scheduled, setScheduled] = useState('Scheduled: none')
  const [pending, setPending] = useState('Pending: none')
  const [presented, setPresented] = useState('Presented: none')
  const [count, setCount] = useState(0)

  useEffect(() => {
    const receivedSub = addNotificationReceivedListener((item) =>
      setReceived(`Received: ${item.request.identifier}`)
    )
    const responseSub = addNotificationResponseReceivedListener((event) =>
      setResponse(
        `Response: ${event.notification.request.identifier}/${event.actionIdentifier}`
      )
    )
    // a cold-start tap lands before any listener exists; the mount read is
    // its only delivery, so it is never cleared here.
    setLast(lastLabel())
    return () => {
      receivedSub.remove()
      responseSub.remove()
    }
  }, [])

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
      <Text>{received}</Text>
      <Text>{response}</Text>
      <Text>{last}</Text>
      <Text>{handler}</Text>
      <Text>{scheduled}</Text>
      <Pressable
        testID="one-native-notifications-handler-show"
        style={styles.chip}
        onPress={() => {
          setNotificationHandler({
            handleNotification: async () => ({
              shouldShowBanner: true,
              shouldShowList: true,
              shouldPlaySound: true,
              shouldSetBadge: true,
            }),
          })
          setHandlerName('Handler: show')
        }}
      >
        <Text>Handler shows all</Text>
      </Pressable>
      <Pressable
        testID="one-native-notifications-handler-suppress"
        style={styles.chip}
        onPress={() => {
          setNotificationHandler({
            handleNotification: async () => ({
              shouldShowBanner: false,
              shouldShowList: false,
              shouldPlaySound: false,
              shouldSetBadge: false,
            }),
          })
          setHandlerName('Handler: suppress')
        }}
      >
        <Text>Handler suppresses</Text>
      </Pressable>
      <Pressable
        testID="one-native-notifications-handler-null"
        style={styles.chip}
        onPress={() => {
          setNotificationHandler(null)
          setHandlerName('Handler: null')
        }}
      >
        <Text>Handler null</Text>
      </Pressable>
      <Pressable
        testID="one-native-notifications-schedule-now"
        style={styles.chip}
        onPress={() => {
          const next = count + 1
          setCount(next)
          scheduleNotificationAsync({
            identifier: `n3-${next}`,
            content: { title: 'N3 ping', body: `arrival ${next}` },
            trigger: null,
          }).then(
            (id) => setScheduled(`Scheduled: ${id}`),
            (error) => setScheduled(`Scheduled: error ${show(error)}`)
          )
        }}
      >
        <Text>Schedule now</Text>
      </Pressable>
      <Pressable
        testID="one-native-notifications-last-refresh"
        style={styles.chip}
        onPress={() => setLast(lastLabel())}
      >
        <Text>Refresh last response</Text>
      </Pressable>
      <Pressable
        testID="one-native-notifications-last-clear"
        style={styles.chip}
        onPress={() => {
          clearLastNotificationResponse()
          setLast('Last: cleared')
        }}
      >
        <Text>Clear last response</Text>
      </Pressable>
      <Text>{pending}</Text>
      <Text>{presented}</Text>
      <Pressable
        testID="one-native-notifications-schedule-interval"
        style={styles.chip}
        onPress={() =>
          scheduleNotificationAsync({
            identifier: 'n4-interval',
            content: { title: 'N4 interval' },
            trigger: { type: 'timeInterval', seconds: 5 },
          }).then(
            (id) => setScheduled(`Scheduled: ${id}`),
            (error) => setScheduled(`Scheduled: error ${show(error)}`)
          )
        }
      >
        <Text>Schedule 5s interval</Text>
      </Pressable>
      <Pressable
        testID="one-native-notifications-schedule-date"
        style={styles.chip}
        onPress={() =>
          scheduleNotificationAsync({
            identifier: 'n4-date',
            content: { title: 'N4 date' },
            trigger: { type: 'date', date: Date.now() + 5000 },
          }).then(
            (id) => setScheduled(`Scheduled: ${id}`),
            (error) => setScheduled(`Scheduled: error ${show(error)}`)
          )
        }
      >
        <Text>Schedule date +5s</Text>
      </Pressable>
      <Pressable
        testID="one-native-notifications-schedule-cold"
        style={styles.chip}
        onPress={() =>
          scheduleNotificationAsync({
            identifier: 'n4-cold',
            content: { title: 'N4 cold' },
            trigger: { type: 'date', date: Date.now() + 15000 },
          }).then(
            (id) => setScheduled(`Scheduled: ${id}`),
            (error) => setScheduled(`Scheduled: error ${show(error)}`)
          )
        }
      >
        <Text>Schedule date +15s</Text>
      </Pressable>
      <Pressable
        testID="one-native-notifications-scheduled-list"
        style={styles.chip}
        onPress={() =>
          getAllScheduledNotificationsAsync().then(
            (list) =>
              setPending(
                list.length
                  ? `Pending: ${list.map((item) => item.identifier).sort().join(',')}`
                  : 'Pending: none'
              ),
            (error) => setPending(`Pending: error ${show(error)}`)
          )
        }
      >
        <Text>List scheduled</Text>
      </Pressable>
      <Pressable
        testID="one-native-notifications-cancel-interval"
        style={styles.chip}
        onPress={() =>
          cancelScheduledNotificationAsync('n4-interval').then(
            () => setPending('Pending: cancelled'),
            (error) => setPending(`Pending: error ${show(error)}`)
          )
        }
      >
        <Text>Cancel interval</Text>
      </Pressable>
      <Pressable
        testID="one-native-notifications-presented-list"
        style={styles.chip}
        onPress={() =>
          getPresentedNotificationsAsync().then(
            (list) =>
              setPresented(
                list.length
                  ? `Presented: ${list.map((item) => item.request.identifier).sort().join(',')}`
                  : 'Presented: none'
              ),
            (error) => setPresented(`Presented: error ${show(error)}`)
          )
        }
      >
        <Text>List presented</Text>
      </Pressable>
      <Pressable
        testID="one-native-notifications-dismiss-date"
        style={styles.chip}
        onPress={() =>
          dismissNotificationAsync('n4-date').then(
            () => setPresented('Presented: dismissed'),
            (error) => setPresented(`Presented: error ${show(error)}`)
          )
        }
      >
        <Text>Dismiss date</Text>
      </Pressable>
      <Pressable
        testID="one-native-notifications-cancel-all"
        style={styles.chip}
        onPress={() =>
          cancelAllScheduledNotificationsAsync().then(
            () => setPending('Pending: cancelled'),
            (error) => setPending(`Pending: error ${show(error)}`)
          )
        }
      >
        <Text>Cancel all</Text>
      </Pressable>
      <Pressable
        testID="one-native-notifications-dismiss-all"
        style={styles.chip}
        onPress={() =>
          dismissAllNotificationsAsync().then(
            () => setPresented('Presented: dismissed'),
            (error) => setPresented(`Presented: error ${show(error)}`)
          )
        }
      >
        <Text>Dismiss all</Text>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, gap: 8 },
  chip: { padding: 12, backgroundColor: '#eee', borderRadius: 8 },
})
