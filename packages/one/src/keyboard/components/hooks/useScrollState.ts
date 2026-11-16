import { useCallback, useEffect } from 'react'
import { useEvent, useSharedValue } from 'react-native-reanimated'

import { useEventHandlerRegistration } from '../../internal'

import type { LayoutChangeEvent } from 'react-native'
import type { AnimatedRef } from 'react-native-reanimated'
import type Reanimated from 'react-native-reanimated'

const NATIVE_SCROLL_EVENT_NAMES = [
  'onScroll',
  'onScrollBeginDrag',
  'onScrollEndDrag',
  'onMomentumScrollBegin',
  'onMomentumScrollEnd',
]

type ScrollEvent = {
  contentOffset: {
    x: number
    y: number
  }
  layoutMeasurement: {
    width: number
    height: number
  }
  contentSize: {
    width: number
    height: number
  }
}

const useScrollState = (ref: AnimatedRef<Reanimated.ScrollView>, initialOffset = 0) => {
  const offset = useSharedValue(initialOffset)
  const layout = useSharedValue({ width: 0, height: 0 })
  const size = useSharedValue({ width: 0, height: 0 })

  const register = useEventHandlerRegistration(ref)

  const eventHandler = useEvent((event: ScrollEvent) => {
    'worklet'

    // eslint-disable-next-line react-compiler/react-compiler
    offset.value = event.contentOffset.y
    layout.value = event.layoutMeasurement
    size.value = event.contentSize
  }, NATIVE_SCROLL_EVENT_NAMES)

  useEffect(() => {
    const cleanup = register(eventHandler)

    return () => {
      cleanup()
    }
  }, [])

  // `onContentSizeChange` is synthesized in JS (from the content container's
  // onLayout) and `onLayout` has a different payload shape than scroll events,
  // so neither can be reliably captured via native event registration.
  // Instead we expose callbacks for the consumer to attach as props.
  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      layout.value = {
        width: e.nativeEvent.layout.width,
        height: e.nativeEvent.layout.height,
      }
    },
    [layout]
  )

  const onContentSizeChange = useCallback(
    (w: number, h: number) => {
      size.value = { width: w, height: h }
    },
    [size]
  )

  return { offset, layout, size, onLayout, onContentSizeChange }
}

export default useScrollState
