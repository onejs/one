import { useMemo } from 'react'
import { Platform } from 'react-native'
import { Easing, useSharedValue, withTiming } from 'react-native-reanimated'

import { useKeyboardHandler } from '../../hooks'
import { useAnimatedReaction } from '../../reanimated'

const IS_ANDROID_ELEVEN_OR_HIGHER = Platform.OS === 'android' && Platform.Version >= 30
// on these platforms keyboard transitions will be smooth
const IS_ANDROID_ELEVEN_OR_HIGHER_OR_IOS =
  IS_ANDROID_ELEVEN_OR_HIGHER || Platform.OS === 'ios'
// on Android Telegram is not using androidx.core values and uses custom interpolation
// duration is taken from here: https://github.com/DrKLO/Telegram/blob/e9a35cea54c06277c69d41b8e25d94b5d7ede065/TMessagesProj/src/main/java/org/telegram/ui/ActionBar/AdjustPanLayoutHelper.java#L39
// and bezier is taken from: https://github.com/DrKLO/Telegram/blob/e9a35cea54c06277c69d41b8e25d94b5d7ede065/TMessagesProj/src/main/java/androidx/recyclerview/widget/ChatListItemAnimator.java#L40
const TELEGRAM_ANDROID_TIMING_CONFIG = {
  duration: 250,
  easing: Easing.bezier(
    0.19919472913616398,
    0.010644531250000006,
    0.27920937042459737,
    0.91025390625
  ),
}

/**
 * Hook that uses default transitions for iOS and Android > 11, and uses
 * custom interpolation on Android < 11 to achieve more smooth animation.
 *
 * @param unstableHandler - Object containing keyboard event handlers.
 * @param [deps] - Dependencies array for the effect.
 * @example
 * ```ts
 * useSmoothKeyboardHandler(
 *   {
 *     onStart: (e) => {
 *       "worklet";
 *
 *       // your handler for keyboard start
 *     },
 *   },
 *   [],
 * );
 * ```
 */
export const useSmoothKeyboardHandler: typeof useKeyboardHandler = (
  unstableHandler,
  deps
) => {
  // eslint-disable-next-line react-compiler/react-compiler, react-hooks/exhaustive-deps
  const handler = useMemo(() => unstableHandler, deps ?? [])
  const target = useSharedValue(-1)
  const height = useSharedValue(0)
  const persistedHeight = useSharedValue(0)
  const animatedKeyboardHeight = useSharedValue(0)

  useAnimatedReaction(
    () => {
      if (IS_ANDROID_ELEVEN_OR_HIGHER_OR_IOS) {
        return
      }
      if (persistedHeight.value === 0) {
        return
      }
      const event = {
        // it'll be always `TELEGRAM_ANDROID_TIMING_CONFIG.duration`, since we're running animation via `withTiming`
        duration: TELEGRAM_ANDROID_TIMING_CONFIG.duration,
        target: target.value,
        height: animatedKeyboardHeight.value,
        progress: animatedKeyboardHeight.value / persistedHeight.value,
      }

      return event
    },
    (evt, previous) => {
      // A dependency change restarts the mapper with the same keyboard frame.
      // Replaying it can race with a pending focused-input layout measurement.
      if (
        !evt ||
        (evt.height === previous?.height &&
          evt.target === previous?.target &&
          evt.progress === previous?.progress)
      ) {
        return
      }
      handler.onMove?.(evt)

      // dispatch `onEnd`
      if (evt.height === height.value) {
        handler.onEnd?.(evt)
        persistedHeight.value = height.value
      }
    },
    // create shallow copy (if deps specified) since `useAnimatedReaction` modifies them
    deps ? [...deps] : deps
  )

  useKeyboardHandler(
    {
      onStart: (e) => {
        'worklet'

        // immediately dispatch onStart/onEnd events if onStart dispatched with the same height
        // and don't wait for animation 250ms
        if (!IS_ANDROID_ELEVEN_OR_HIGHER_OR_IOS && e.height === persistedHeight.value) {
          handler.onStart?.(e)
          handler.onEnd?.(e)

          return
        }

        target.value = e.target
        height.value = e.height

        if (e.height > 0) {
          persistedHeight.value = e.height
        }
        // if we are running on Android < 9, then we are using custom interpolation
        // to achieve smoother animation and use `animatedKeyboardHeight` as animation
        // driver
        if (!IS_ANDROID_ELEVEN_OR_HIGHER_OR_IOS) {
          animatedKeyboardHeight.value = withTiming(
            e.height,
            TELEGRAM_ANDROID_TIMING_CONFIG
          )
        }

        handler.onStart?.({
          ...e,
          duration: IS_ANDROID_ELEVEN_OR_HIGHER_OR_IOS
            ? e.duration
            : TELEGRAM_ANDROID_TIMING_CONFIG.duration,
        })
      },
      onMove: (e) => {
        'worklet'

        if (IS_ANDROID_ELEVEN_OR_HIGHER_OR_IOS) {
          handler.onMove?.(e)
        }
      },
      onEnd: (e) => {
        'worklet'

        if (IS_ANDROID_ELEVEN_OR_HIGHER_OR_IOS) {
          handler.onEnd?.(e)
        }
      },
    },
    deps
  )
}
