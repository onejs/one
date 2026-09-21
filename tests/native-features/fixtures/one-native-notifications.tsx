import { Notifications } from '@vxrn/native/notifications'
import { useEffect, useRef, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native'

// exercises the Notifications namespace slice by slice. readings travel as
// labels because RN Text testIDs vanish from the accessibility snapshot
// while Pressable IDs survive. listeners stay unmounted until Subscribe:
// the unobserved check proves an arrival with nobody listening still
// presents without waiting out the 3s backstop.
function show(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function lastLabel() {
  const last = Notifications.getLastResponse()
  if (!last) return 'Last: none'
  const title = last.notification.request.content.title || 'untitled'
  return `Last: ${last.notification.request.identifier}/${title}`
}

export default function OneNativeNotifications() {
  const [permission, setPermission] = useState('Permission: unknown')
  const [badge, setBadge] = useState('Badge: unknown')
  const [channel, setChannel] = useState('Channel: unknown')
  const [channels, setChannels] = useState('Channels: unknown')
  const [subscribed, setSubscribed] = useState('Subscribed: no')
  const [unobserved, setUnobserved] = useState('Unobserved: none')
  const [received, setReceived] = useState('Received: none')
  const [response, setResponse] = useState('Response: none')
  const [last, setLast] = useState('Last: none')
  const [handler, setHandlerName] = useState('Handler: default')
  const [scheduled, setScheduled] = useState('Scheduled: none')
  const [pending, setPending] = useState('Pending: none')
  const [presented, setPresented] = useState('Presented: none')
  const [count, setCount] = useState(0)
  const subs = useRef<{ remove: () => void }[]>([])

  useEffect(() => {
    // a cold-start tap lands before any listener exists; the mount read is
    // its only delivery, so it is never cleared here.
    setLast(lastLabel())
    return () => {
      subs.current.forEach((sub) => sub.remove())
      subs.current = []
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
          Notifications.getPermissions().then(
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
          Notifications.requestPermissions().then(
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
          Notifications.getBadgeCount().then(
            (value) => setBadge(`Badge: ${value}`),
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
          Notifications.setBadgeCount(5).then(
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
          Notifications.setBadgeCount(0).then(
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
          Notifications.setChannel('test-channel', {
            name: 'Test Channel',
            importance: 'default',
          }).then(
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
          Notifications.getChannel('test-channel').then(
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
          Notifications.deleteChannel('test-channel').then(
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
          Notifications.getChannels().then(
            (list) => setChannels(`Channels: ${list.length}`),
            (error) => setChannels(`Channels: error ${show(error)}`)
          )
        }
      >
        <Text>List channels</Text>
      </Pressable>
      <Text>{subscribed}</Text>
      <Text>{unobserved}</Text>
      <Pressable
        testID="one-native-notifications-schedule-unobserved"
        style={styles.chip}
        onPress={async () => {
          // no listeners are mounted yet: native must present this itself,
          // long before the 3s backstop it keeps for stalled js.
          await Notifications.schedule({
            identifier: 'n3-unobserved',
            content: { title: 'N3 unobserved' },
            trigger: null,
          }).catch((error) => setUnobserved(`Unobserved: error ${show(error)}`))
          const start = Date.now()
          for (;;) {
            const list = await Notifications.getPresented()
            if (list.some((item) => item.request.identifier === 'n3-unobserved')) {
              setUnobserved(`Unobserved: presented in ${Date.now() - start}ms`)
              return
            }
            if (Date.now() - start > 2500) {
              setUnobserved('Unobserved: timeout')
              return
            }
            await new Promise((resolve) => setTimeout(resolve, 150))
          }
        }}
      >
        <Text>Schedule unobserved</Text>
      </Pressable>
      <Pressable
        testID="one-native-notifications-subscribe"
        style={styles.chip}
        onPress={() => {
          if (subs.current.length) return
          subs.current = [
            Notifications.addReceivedListener((item) =>
              setReceived(`Received: ${item.request.identifier}`)
            ),
            Notifications.addResponseReceivedListener((event) =>
              setResponse(
                `Response: ${event.notification.request.identifier}/${event.actionIdentifier}`
              )
            ),
          ]
          setSubscribed('Subscribed: yes')
        }}
      >
        <Text>Subscribe events</Text>
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
          Notifications.setHandler({
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
          Notifications.setHandler({
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
          Notifications.setHandler(null)
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
          Notifications.schedule({
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
          Notifications.clearLastResponse()
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
          Notifications.schedule({
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
          Notifications.schedule({
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
          Notifications.schedule({
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
          Notifications.getAllScheduled().then(
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
          Notifications.cancelScheduled('n4-interval').then(
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
          Notifications.getPresented().then(
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
          Notifications.dismiss('n4-date').then(
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
          Notifications.cancelAllScheduled().then(
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
          Notifications.dismissAll().then(
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
