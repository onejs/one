import { useMemo, useRef, useState } from 'react'
import { Pressable, ScrollView, Text } from 'react-native'
import {
  NotificationCenter,
  NSNotification_Name,
  Progress,
  ProgressManager,
  type Notification,
} from 'one/ios/Foundation'
import { useSDKProperty, useSDKSequence, type SDKState } from 'one/ios-runtime'

const describe = (state: SDKState<unknown>) =>
  state.status === 'error' ? `error ${state.error.message}` : String(state.value ?? 'pending')

// a key-value observed objective-c property
function ObservedProgress({ progress }: { progress: Progress }) {
  const state = useSDKProperty(progress, 'fractionCompleted')
  return <Text testID="sdk-state-kvo">{`KVO progress: ${describe(state)}`}</Text>
}

// a property of an Observation.Observable swift class
function ObservedManager({ manager }: { manager: ProgressManager }) {
  const state = useSDKProperty(manager, 'fractionCompleted')
  return <Text testID="sdk-state-tracking">{`Observable manager: ${describe(state)}`}</Text>
}

function NotificationText({ label, testID, state }: { label: string; testID: string; state: SDKState<Notification> }) {
  const text = state.status === 'value' ? String(state.value.object) : describe(state)
  return <Text testID={testID}>{`${label}: ${text}`}</Text>
}

export default function OneNativeIosSdkState() {
  const progress = useMemo(() => Progress.initTotalUnitCount(4), [])
  const manager = useMemo(() => ProgressManager.init(4), [])
  const name = useMemo(() => NSNotification_Name.init('one.sdk.state.ping'), [])
  const notifications = useMemo(() => NotificationCenter.default.notifications(name), [name])
  const publisher = useMemo(() => NotificationCenter.default.publisher(name), [name])
  const [mounted, setMounted] = useState(true)
  const pings = useRef(0)
  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
      <Text>SDK state hooks</Text>
      {mounted ? (
        <SubscribedState
          progress={progress}
          manager={manager}
          notifications={notifications}
          publisher={publisher}
        />
      ) : (
        <Text testID="sdk-state-unmounted">Hooks unmounted</Text>
      )}
      <Pressable
        testID="sdk-state-advance"
        onPress={() => {
          progress.completedUnitCount += 1
          manager.complete(1)
        }}
      >
        <Text>Advance native progress</Text>
      </Pressable>
      <Pressable
        testID="sdk-state-post"
        onPress={() => NotificationCenter.default.postNameObject(name, `ping ${++pings.current}`)}
      >
        <Text>Post notification</Text>
      </Pressable>
      <Pressable testID="sdk-state-toggle" onPress={() => setMounted((value) => !value)}>
        <Text>Toggle hooks</Text>
      </Pressable>
    </ScrollView>
  )
}

function SubscribedState(props: {
  progress: Progress
  manager: ProgressManager
  notifications: ReturnType<NotificationCenter['notifications']>
  publisher: ReturnType<NotificationCenter['publisher']>
}) {
  const sequence = useSDKSequence(props.notifications)
  const published = useSDKSequence(props.publisher)
  return (
    <>
      <ObservedProgress progress={props.progress} />
      <ObservedManager manager={props.manager} />
      <NotificationText label="AsyncSequence" testID="sdk-state-sequence" state={sequence} />
      <NotificationText label="Publisher" testID="sdk-state-publisher" state={published} />
    </>
  )
}
