import { useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
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
      <Text>Flat iOS adaptive contract</Text>
      <Text testID="adaptive-lifecycle" style={{ height: 40, lineHeight: 20 }}>
        {JSON.stringify({ ...lifecycle, effectPasses: __DEV__ ? 2 : 1 })}
      </Text>
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
      <Text testID="adaptive-reading" style={{ fontSize: 10, lineHeight: 12 }}>
        {JSON.stringify({
          ready,
          initialReady,
          layout,
          size,
          hinge,
          regions,
          allRegions,
          segments,
          spanning,
          reading,
          listener,
          error,
        })}
      </Text>
      <Pressable
        testID="adaptive-refresh"
        onPress={() => setRefresh(refresh + 1)}
        style={{ padding: 12 }}
      >
        <Text>Refresh getters</Text>
      </Pressable>
    </View>
  )
}
