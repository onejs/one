import { useLayoutEffect } from 'react'
import { Platform } from 'react-native'
import { runOnUI, useSharedValue } from 'react-native-reanimated'

import { useKeyboardContext } from '../../context'
import { useKeyboardHandler } from '../../hooks'

const OS = Platform.OS

export const useKeyboardAnimation = () => {
  const { reanimated } = useKeyboardContext()

  const heightWhenOpened = useSharedValue(0)
  const height = useSharedValue(0)
  const progress = useSharedValue(0)
  const isClosed = useSharedValue(true)
  const hasReceivedEvent = useSharedValue(false)

  useLayoutEffect(() => {
    // writes from JS are applied on the UI thread asynchronously, so they may
    // overwrite values set by keyboard events that arrived in between (i. e. when
    // input has `autoFocus`) - set initial values only if no event arrived yet
    runOnUI(() => {
      'worklet'

      if (hasReceivedEvent.value) {
        return
      }

      const initialHeight = -reanimated.height.value
      const initialProgress = reanimated.progress.value

      // eslint-disable-next-line react-compiler/react-compiler
      heightWhenOpened.value = initialHeight
      height.value = initialHeight
      progress.value = initialProgress
      isClosed.value = initialProgress === 0
    })()
  }, [])

  useKeyboardHandler(
    {
      onStart: (e) => {
        'worklet'

        hasReceivedEvent.value = true

        if (e.height > 0) {
          isClosed.value = false
          heightWhenOpened.value = e.height
        }
      },
      onMove: (e) => {
        'worklet'

        hasReceivedEvent.value = true
        progress.value = e.progress
        height.value = e.height
      },
      onInteractive: (e) => {
        'worklet'

        hasReceivedEvent.value = true
        progress.value = e.progress
        height.value = e.height
      },
      onEnd: (e) => {
        'worklet'

        hasReceivedEvent.value = true
        isClosed.value = e.height === 0

        // `onStart` may have been dispatched before this handler was attached
        if (e.height > 0 && e.progress === 1) {
          heightWhenOpened.value = e.height
        }

        height.value = e.height
        progress.value = e.progress
      },
    },
    []
  )

  return { height, progress, heightWhenOpened, isClosed }
}
export const useTranslateAnimation = () => {
  const { reanimated } = useKeyboardContext()

  const padding = useSharedValue(0)
  const translate = useSharedValue(0)
  const hasReceivedEvent = useSharedValue(false)

  useLayoutEffect(() => {
    // see `useKeyboardAnimation` for an explanation
    runOnUI(() => {
      'worklet'

      if (!hasReceivedEvent.value) {
        // eslint-disable-next-line react-compiler/react-compiler
        padding.value = reanimated.progress.value
      }
    })()
  }, [])

  useKeyboardHandler(
    {
      onStart: (e) => {
        'worklet'

        hasReceivedEvent.value = true

        if (e.height === 0) {
          padding.value = 0
        }
        if (OS === 'ios') {
          translate.value = e.progress
        }
      },
      onMove: (e) => {
        'worklet'

        hasReceivedEvent.value = true

        if (OS !== 'ios') {
          translate.value = e.progress
        }
      },
      onInteractive: (e) => {
        'worklet'

        hasReceivedEvent.value = true
        padding.value = 0

        translate.value = e.progress
      },
      onEnd: (e) => {
        'worklet'

        hasReceivedEvent.value = true
        padding.value = e.progress

        if (OS !== 'ios') {
          translate.value = e.progress
        }
      },
    },
    []
  )

  return { translate, padding }
}
