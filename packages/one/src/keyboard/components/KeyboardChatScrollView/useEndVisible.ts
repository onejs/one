import { useMemo } from 'react'
import { runOnJS } from 'react-native-reanimated'

import { useAnimatedReaction, useDerivedValue } from '../../reanimated'

import { isScrollAtEnd } from './useChatKeyboard/helpers'

import type { SharedValue } from 'react-native-reanimated'

type EndVisibleCallback = (visible: boolean) => void

type Options = {
  scroll: SharedValue<number>
  layout: SharedValue<{ width: number; height: number }>
  size: SharedValue<{ width: number; height: number }>
  inverted: boolean
  onEndVisible?: EndVisibleCallback
}

const hasWorkletHash = (value: unknown): boolean =>
  typeof value === 'function' &&
  !!(value as unknown as Record<string, unknown>).__workletHash

export const useEndVisible = ({
  scroll,
  layout,
  size,
  inverted,
  onEndVisible,
}: Options) => {
  const isWorklet = useMemo(() => hasWorkletHash(onEndVisible), [onEndVisible])

  const isAtEnd = useDerivedValue(() => {
    // Wait until the scroll view has been measured to avoid a spurious initial
    // `true` on a (0,0,0) layout (the helper would otherwise treat unmeasured
    // state as "at end" because 0 + 0 >= 0 - threshold).
    if (layout.value.height === 0 || size.value.height === 0) {
      return null
    }

    return isScrollAtEnd(scroll.value, layout.value.height, size.value.height, inverted)
  })

  useAnimatedReaction(
    () => isAtEnd.value,
    (current, previous) => {
      if (current === null || current === previous || !onEndVisible) {
        return
      }

      if (isWorklet) {
        onEndVisible(current)
      } else {
        runOnJS(onEndVisible)(current)
      }
    },
    [onEndVisible, isWorklet, inverted]
  )
}
