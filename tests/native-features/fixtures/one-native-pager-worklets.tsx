import { useEffect, useRef, useState } from 'react'
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useEvent,
  useSharedValue,
} from 'react-native-reanimated'
import { isUIRuntime, scheduleOnRN } from 'react-native-worklets'
import { Pager } from '../../../packages/one/src/platform/ui/Pager'
import type {
  PagerRef,
  PagerScrollEvent,
} from '../../../packages/one/src/platform/ui/pagerTypes'

const AnimatedPager = Animated.createAnimatedComponent(Pager)
const STEP = 100
const BLOCK_MS = 12000

// a worklet onPageScroll drives the indicator from the UI thread. "Block JS"
// busy-waits the JS thread, so any indicator motion during the block cannot come
// from a JS handler; "JS handler" swaps in a plain function as the control.
export default function PagerWorklets() {
  const pager = useRef<PagerRef>(null)
  const progress = useSharedValue(0)
  const events = useSharedValue(0)
  const reported = useSharedValue(false)
  const [runtime, setRuntime] = useState('pending')
  const [js, setJS] = useState('idle')
  const [jsHandler, setJSHandler] = useState(false)
  const [selected, setSelected] = useState(0)
  const [refKeys, setRefKeys] = useState('pending')
  const native = Platform.OS !== 'web'
  const onWorkletScroll = useEvent<{ position: number; offset: number }>(
    (event) => {
      'worklet'
      progress.value = event.position + event.offset
      events.value += 1
      if (!reported.value) {
        reported.value = true
        scheduleOnRN(
          setRuntime,
          native ? (isUIRuntime() ? 'ui' : 'wrong-runtime') : 'web'
        )
      }
    },
    ['onPageScroll']
  )
  const onJSScroll = ({ nativeEvent }: PagerScrollEvent) => {
    progress.value = nativeEvent.position + nativeEvent.offset
    events.value += 1
    setRuntime('js')
  }
  useEffect(() => {
    if (js !== 'blocking') return
    // a later task, so the blocking label reaches the screen before the block
    const timer = setTimeout(() => {
      const start = Date.now()
      const before = events.value
      while (Date.now() - start < BLOCK_MS) {}
      const end = Date.now()
      setJS(`blocked ${start}..${end}, ui events ${events.value - before}`)
    })
    return () => clearTimeout(timer)
  }, [js])
  const indicator = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * STEP }],
  }))

  return (
    <View style={styles.screen}>
      <Text testID="pager-worklets-runtime">Scroll runtime: {runtime}</Text>
      <Text testID="pager-worklets-js">JS: {js}</Text>
      <Text testID="pager-worklets-selected">Selected: {selected}</Text>
      <Text testID="pager-worklets-ref">Ref: {refKeys}</Text>
      <View style={styles.row}>
        <Pressable
          testID="pager-worklets-block"
          accessibilityRole="button"
          onPress={() => setJS('blocking')}
        >
          <Text>Block JS</Text>
        </Pressable>
        <Pressable
          testID="pager-worklets-set-page"
          accessibilityRole="button"
          onPress={() => {
            setRefKeys(pager.current ? Object.keys(pager.current).join(',') : 'null')
            pager.current?.setPage(2)
          }}
        >
          <Text>Set page 2</Text>
        </Pressable>
        <Pressable
          testID="pager-worklets-js-handler"
          accessibilityRole="button"
          onPress={() => setJSHandler(true)}
        >
          <Text>JS handler</Text>
        </Pressable>
      </View>
      <View style={styles.track}>
        <Animated.View
          testID="pager-worklets-indicator"
          accessible
          accessibilityLabel="Page indicator"
          style={[styles.indicator, indicator]}
        />
      </View>
      {/* the control remounts: Reanimated keeps a worklet handler registered when
          the prop changes to a plain function */}
      <AnimatedPager
        key={jsHandler ? 'js' : 'worklet'}
        ref={pager}
        testID="pager-worklets-pager"
        style={styles.pager}
        onPageScroll={jsHandler ? onJSScroll : onWorkletScroll}
        onPageSelected={({ nativeEvent }) => setSelected(nativeEvent.position)}
      >
        {['#fde68a', '#bae6fd', '#bbf7d0'].map((color, index) => (
          <View
            key={color}
            testID={`pager-worklets-page-${index}`}
            accessible
            accessibilityLabel={`Page ${index}`}
            style={{ backgroundColor: color }}
          >
            <Text>Page {index}</Text>
          </View>
        ))}
      </AnimatedPager>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 24, gap: 12, backgroundColor: '#fff' },
  row: { flexDirection: 'row', gap: 16 },
  track: { height: 32, justifyContent: 'center' },
  indicator: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#2767d8' },
  pager: { height: 320 },
})
