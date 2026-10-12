import { useEffect, useState } from 'react'
import { Platform, Pressable, Text, View } from 'react-native'
import {
  One,
  getHinge,
  getSizeClass,
  onHingeChange,
  useHinge,
  useReservedRegions,
  useReservedRegionsReady,
  useSizeClass,
  useSpanning,
  useWindowSegments,
  type HingeState,
  type SizeClass,
} from 'one'

type Lifecycle = {
  subscriptions: number
  removals: number
  events: number
  nonNullEvents: number
}

export default function OneNativeAdaptiveFixture() {
  const [mounted, setMounted] = useState(true)
  const [small, setSmall] = useState(false)
  const [layout, setLayout] = useState({ width: 0, height: 0 })
  const [lifecycle, setLifecycle] = useState<Lifecycle>({
    subscriptions: 0,
    removals: 0,
    events: 0,
    nonNullEvents: 0,
  })
  return (
    <View
      testID="adaptive-fixture"
      style={{ flex: 1, padding: 16, backgroundColor: '#fff' }}
    >
      <Text>Flat device adaptive contract</Text>
      <Text testID="adaptive-lifecycle" style={{ height: 40, lineHeight: 20 }}>
        {JSON.stringify({ ...lifecycle, effectPasses: __DEV__ ? 2 : 1 })}
      </Text>
      {Platform.OS === 'ios' && <OrientationControls />}
      <Pressable
        testID="adaptive-toggle"
        onPress={() => setMounted(!mounted)}
        style={{ padding: 12 }}
      >
        <Text>{mounted ? 'Unmount provider' : 'Mount provider'}</Text>
      </Pressable>
      <Pressable
        testID="adaptive-resize"
        onPress={() => setSmall(!small)}
        style={{ padding: 12 }}
      >
        <Text>Resize provider</Text>
      </Pressable>
      {mounted && (
        <One.UI.ReservedRegions.Provider
          testID="adaptive-provider"
          style={{ width: small ? 220 : 280, height: small ? 220 : 300 }}
          onLayout={({ nativeEvent }) =>
            setLayout({
              width: nativeEvent.layout.width,
              height: nativeEvent.layout.height,
            })
          }
        >
          <Reading layout={layout} setLifecycle={setLifecycle} />
        </One.UI.ReservedRegions.Provider>
      )}
    </View>
  )
}

// rotates the scene behind the provider so the adaptive-live suite can flip
// the trait collection: portrait is compact/regular and landscapeLeft is
// regular/compact on a Pro Max. sits outside the provider so mount toggles
// never move it.
function OrientationControls() {
  const [orientation, setOrientation] = useState('pending')
  const [status, setStatus] = useState('idle')
  const lock = async (value: 'landscapeLeft' | 'portrait') => {
    try {
      setStatus(`locking-${value}`)
      setOrientation(String(await One.ScreenOrientation.lock(value)))
      setStatus(`locked-${value}`)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error))
    }
  }
  return (
    <View>
      <Text testID="adaptive-orientation">{`${orientation}/${status}`}</Text>
      <Pressable
        testID="adaptive-orientation-landscape"
        onPress={() => lock('landscapeLeft')}
        style={{ padding: 12 }}
      >
        <Text>Lock landscape</Text>
      </Pressable>
      <Pressable
        testID="adaptive-orientation-portrait"
        onPress={() => lock('portrait')}
        style={{ padding: 12 }}
      >
        <Text>Lock portrait</Text>
      </Pressable>
    </View>
  )
}

function Reading({
  layout,
  setLifecycle,
}: {
  layout: { width: number; height: number }
  setLifecycle: React.Dispatch<React.SetStateAction<Lifecycle>>
}) {
  const size = useSizeClass()
  const hinge = useHinge()
  const ready = useReservedRegionsReady()
  const regions = useReservedRegions()
  const allRegions = useReservedRegions({ includeInactive: true })
  const segments = useWindowSegments()
  const spanning = useSpanning()
  const [initialReady] = useState(ready)
  const [frozenSegments, setFrozenSegments] = useState<typeof segments | null>(null)
  const [reading, setReading] = useState<{
    size: SizeClass
    hinge: HingeState | null
    reads: number
  } | null>(null)
  const [refresh, setRefresh] = useState(0)
  const [error, setError] = useState('')
  const [listener, setListener] = useState<{ events: number; value?: HingeState | null }>(
    { events: 0 }
  )
  useEffect(() => {
    setLifecycle((value) => ({ ...value, subscriptions: value.subscriptions + 1 }))
    const remove = onHingeChange((next) => {
      setListener((value) => ({ events: value.events + 1, value: next }))
      setLifecycle((value) => ({
        ...value,
        events: value.events + 1,
        nonNullEvents: value.nonNullEvents + Number(next !== null),
      }))
    })
    return () => {
      remove()
      setLifecycle((value) => ({ ...value, removals: value.removals + 1 }))
    }
  }, [setLifecycle])
  useEffect(() => {
    let active = true
    Promise.all([getSizeClass(), getHinge()])
      .then(([nextSize, nextHinge]) => {
        if (active) setReading({ size: nextSize, hinge: nextHinge, reads: refresh + 1 })
      })
      .catch((cause) => {
        if (active) setError(String(cause))
      })
    return () => {
      active = false
    }
  }, [refresh])
  return (
    <View>
      <Pressable
        testID="adaptive-refresh"
        onPress={() => setRefresh(refresh + 1)}
        style={{ padding: 12 }}
      >
        <Text>Refresh getters</Text>
      </Pressable>
      <Text testID="adaptive-reading" style={{ fontSize: 10, lineHeight: 12 }}>
        {JSON.stringify({
          ready,
          initialReady,
          layout,
          size,
          hinge,
          regions,
          allRegions,
          segments: frozenSegments ?? segments,
          spanning,
          reading,
          listener,
          error,
        })}
      </Text>
      {Platform.OS === 'android' && (
        <Pressable testID="adaptive-freeze-segments"
          onPress={() => setFrozenSegments(segments)} style={{ padding: 12 }}>
          <Text>Freeze reported segments</Text>
        </Pressable>
      )}
    </View>
  )
}
