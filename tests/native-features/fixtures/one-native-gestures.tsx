import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { GestureDetector, GestureHandlerRootView, usePanGesture } from 'react-native-gesture-handler'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'
import { scheduleOnRN } from 'react-native-worklets'

export default function OneNativeGestures() {
  const [drag, setDrag] = useState('pending')
  const [animation, setAnimation] = useState('pending')
  const offset = useSharedValue(0)
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: offset.value }] }))
  const pan = usePanGesture({
    onUpdate: (event) => {
      offset.value = event.translationX
    },
    onDeactivate: (event) => {
      scheduleOnRN(setDrag, String(Math.round(event.translationX)))
      offset.value = withTiming(120, { duration: 350 }, (finished) => {
        if (finished) scheduleOnRN(setAnimation, 'finished')
      })
    },
  })

  return (
    <GestureHandlerRootView style={styles.screen}>
      <Text>Drag: {drag}</Text>
      <Text>Animation: {animation}</Text>
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
