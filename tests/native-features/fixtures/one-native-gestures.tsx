import { useState } from 'react'
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import {
  GestureDetector,
  GestureHandlerRootView,
  usePanGesture,
} from 'react-native-gesture-handler'
import Animated, {
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { isUIRuntime, runOnUI, scheduleOnRN } from 'react-native-worklets'

export default function OneNativeGestures() {
  const [drag, setDrag] = useState('pending')
  const [animation, setAnimation] = useState('pending')
  const [ui, setUi] = useState('pending')
  const [gestureRuntime, setGestureRuntime] = useState('pending')
  const [layout, setLayout] = useState('pending')
  const [layoutStarted, setLayoutStarted] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const native = Platform.OS !== 'web'
  const offset = useSharedValue(0)
  const layoutTransition = LinearTransition.duration(600).withCallback((finished) => {
    'worklet'
    if (finished)
      scheduleOnRN(setLayout, native ? (isUIRuntime() ? 'ui' : 'wrong-runtime') : 'web')
  })
  const run = () => {
    runOnUI(() => {
      'worklet'
      offset.value = 40
      scheduleOnRN(setUi, native ? (isUIRuntime() ? 'ui:40' : 'wrong-runtime') : 'web:40')
    })()
  }

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }))
  const pan = usePanGesture({
    onUpdate: (event) => {
      offset.value = event.translationX
    },
    onDeactivate: (event) => {
      scheduleOnRN(
        setGestureRuntime,
        native ? (isUIRuntime() ? 'ui' : 'wrong-runtime') : 'web'
      )
      scheduleOnRN(setDrag, String(Math.round(event.translationX)))
      offset.value = withTiming(120, { duration: 350 }, (finished) => {
        if (finished) scheduleOnRN(setAnimation, 'finished')
      })
    },
  })

  return (
    <GestureHandlerRootView style={styles.screen}>
      <Text testID="worklets-drag-result">Drag: {drag}</Text>
      <Text testID="worklets-animation-result">Animation: {animation}</Text>
      <Text testID="worklets-ui-result">runOnUI: {ui}</Text>
      <Text testID="worklets-gesture-result">Gesture runtime: {gestureRuntime}</Text>
      <Text testID="worklets-layout-result">Layout: {layout}</Text>
      <Pressable testID="worklets-run-ui" accessibilityRole="button" onPress={run}>
        <Text>Run on UI</Text>
      </Pressable>
      <Pressable
        testID="worklets-resize"
        accessibilityRole="button"
        onPress={() => {
          setLayoutStarted(true)
          setLayout('pending')
          setExpanded((value) => !value)
        }}
      >
        <Text>Resize layout</Text>
      </Pressable>
      <Animated.View
        testID="worklets-layout-box"
        accessible
        accessibilityLabel="Layout box"
        layout={layoutStarted ? layoutTransition : undefined}
        style={[styles.box, { width: expanded ? 180 : 72 }]}
      />
      <View style={styles.track}>
        <GestureDetector gesture={pan}>
          <Animated.View
            accessible
            accessibilityLabel="Drag box"
            testID="one-native-gestures-box"
            style={[styles.box, style]}
          />
        </GestureDetector>
      </View>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 24, gap: 16, backgroundColor: '#fff' },
  track: { height: 88, justifyContent: 'center', overflow: 'visible' },
  box: { width: 72, height: 72, borderRadius: 12, backgroundColor: '#2767d8' },
})
