import React, { forwardRef, useMemo } from 'react'
import Reanimated, { interpolate } from 'react-native-reanimated'

import { useReanimatedKeyboardAnimation } from '../../hooks'
import { useAnimatedStyle } from '../../reanimated'

import type { View, ViewProps } from 'react-native'

export type KeyboardStickyViewProps = {
  /**
   * Specify additional offset to the view for given keyboard state.
   */
  offset?: {
    /**
     * Adds additional `translateY` when keyboard is close. By default `0`.
     */
    closed?: number
    /**
     * Adds additional `translateY` when keyboard is open. By default `0`.
     */
    opened?: number
  }

  /** Controls whether this `KeyboardStickyView` instance should take effect. Default is `true`. */
  enabled?: boolean
} & ViewProps

/**
 * A View component that sticks to the keyboard and moves with it when it appears or disappears.
 * The view can be configured with custom offsets for both closed and open keyboard states.
 *
 * @returns An animated View component that sticks to the keyboard.
 * @see {@link https://kirillzyusko.github.io/react-native-keyboard-controller/docs/api/components/keyboard-sticky-view|Documentation} page for more details.
 * @example
 * ```tsx
 * <KeyboardStickyView offset={{ closed: 0, opened: 20 }}>
 *   <Button title="Submit" />
 * </KeyboardStickyView>
 * ```
 */
const KeyboardStickyView = forwardRef<
  View,
  React.PropsWithChildren<KeyboardStickyViewProps>
>(
  (
    {
      children,
      offset: { closed = 0, opened = 0 } = {},
      style,
      enabled = true,
      ...props
    },
    ref
  ) => {
    const { height, progress } = useReanimatedKeyboardAnimation()

    const stickyViewStyle = useAnimatedStyle(() => {
      const offset = interpolate(progress.value, [0, 1], [closed, opened])

      return {
        transform: [{ translateY: enabled ? height.value + offset : closed }],
      }
    }, [closed, opened, enabled])

    const styles = useMemo(() => [style, stickyViewStyle], [style, stickyViewStyle])

    return (
      <Reanimated.View ref={ref} style={styles} {...props}>
        {children}
      </Reanimated.View>
    )
  }
)

export default KeyboardStickyView
