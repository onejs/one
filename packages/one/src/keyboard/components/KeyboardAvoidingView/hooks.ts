import { useLayoutEffect } from 'react'
import { Platform } from 'react-native'
import { useSharedValue } from 'react-native-reanimated'

import { useKeyboardContext } from '../../context'
import { useKeyboardHandler } from '../../hooks'

const OS = Platform.OS

export const useKeyboardAnimation = () => {
  const { reanimated } = useKeyboardContext()

  const heightWhenOpened = useSharedValue(0)
  const height = useSharedValue(0)
  const progress = useSharedValue(0)
  const isClosed = useSharedValue(true)

  useLayoutEffect(() => {
    const initialHeight = -reanimated.height.value
    const initialProgress = reanimated.progress.value

    // eslint-disable-next-line react-compiler/react-compiler
    heightWhenOpened.value = initialHeight
    height.value = initialHeight
    progress.value = initialProgress
    isClosed.value = initialProgress === 0
  }, [])

  useKeyboardHandler(
    {
      onStart: (e) => {
        'worklet'

        if (e.height > 0) {
          isClosed.value = false
          heightWhenOpened.value = e.height
        }
      },
      onMove: (e) => {
        'worklet'

        progress.value = e.progress
        height.value = e.height
      },
      onInteractive: (e) => {
        'worklet'

        progress.value = e.progress
        height.value = e.height
      },
      onEnd: (e) => {
        'worklet'

        isClosed.value = e.height === 0

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

  useLayoutEffect(() => {
    // eslint-disable-next-line react-compiler/react-compiler
    padding.value = reanimated.progress.value
  }, [])

  useKeyboardHandler(
    {
      onStart: (e) => {
        'worklet'

        if (e.height === 0) {
          padding.value = 0
        }
        if (OS === 'ios') {
          translate.value = e.progress
        }
      },
      onMove: (e) => {
        'worklet'

        if (OS !== 'ios') {
          translate.value = e.progress
        }
      },
      onInteractive: (e) => {
        'worklet'

        padding.value = 0

        translate.value = e.progress
      },
      onEnd: (e) => {
        'worklet'

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
