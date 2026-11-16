import React, { forwardRef, useEffect, useMemo, useRef } from 'react'
import { StyleSheet, View } from 'react-native'

import { KEYBOARD_BORDER_RADIUS, KEYBOARD_HAS_ROUNDED_CORNERS } from '../../constants'
import { KeyboardController } from '../../module'
import KeyboardStickyView from '../KeyboardStickyView'

import type { KeyboardStickyViewProps } from '../KeyboardStickyView'

type TranslucentStackEntry = { translucent: boolean }

const translucentStack: TranslucentStackEntry[] = []
let currentTranslucent = false

const applyTranslucent = () => {
  const next =
    translucentStack.length > 0
      ? translucentStack[translucentStack.length - 1].translucent
      : false

  if (next !== currentTranslucent) {
    currentTranslucent = next
    KeyboardController.setTranslucent(next)
  }
}

const pushTranslucentEntry = (entry: TranslucentStackEntry) => {
  translucentStack.push(entry)
  applyTranslucent()
}

const removeTranslucentEntry = (entry: TranslucentStackEntry) => {
  const index = translucentStack.indexOf(entry)

  if (index !== -1) {
    translucentStack.splice(index, 1)
  }

  applyTranslucent()
}

export type KeyboardEffectsProps = {
  /**
   * Whether the keyboard backdrop should be translucent.
   *
   * @default false
   */
  translucent?: boolean
  /**
   * Whether the effect view should match the keyboard's rounded top corners.
   *
   * Set to `false` when the effect should fully cover the keyboard bounds.
   *
   * @default true
   */
  rounded?: boolean
} & KeyboardStickyViewProps

/**
 * A component that renders content behind the keyboard. Since the keyboard
 * is translucent, the content (colors, gradients, animations) will blend
 * through and create visual effects on the keyboard.
 *
 * On iOS 26+ the keyboard has rounded corners, and the effect view
 * automatically matches that shape.
 *
 * @returns A view component positioned behind the keyboard.
 * @example
 * ```tsx
 * <KeyboardEffects>
 *   <View style={{ flex: 1, backgroundColor: "purple" }} />
 * </KeyboardEffects>
 * ```
 */
const KeyboardEffects = forwardRef<View, React.PropsWithChildren<KeyboardEffectsProps>>(
  ({ translucent, rounded = true, children, ...props }, ref) => {
    const stackEntry = useRef<TranslucentStackEntry>({
      translucent: Boolean(translucent),
    }).current
    const containerStyle = useMemo(
      () => [styles.container, KEYBOARD_HAS_ROUNDED_CORNERS && rounded && styles.rounded],
      [rounded]
    )

    useEffect(() => {
      pushTranslucentEntry(stackEntry)

      return () => {
        removeTranslucentEntry(stackEntry)
      }
    }, [stackEntry])

    useEffect(() => {
      stackEntry.translucent = Boolean(translucent)
      applyTranslucent()
    }, [stackEntry, translucent])

    return (
      <KeyboardStickyView ref={ref} {...props}>
        <View style={containerStyle}>{children}</View>
      </KeyboardStickyView>
    )
  }
)

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    top: 0,
    left: 0,
    right: 0,
    height: 999,
  },
  rounded: {
    borderTopLeftRadius: KEYBOARD_BORDER_RADIUS,
    borderTopRightRadius: KEYBOARD_BORDER_RADIUS,
    overflow: 'hidden',
  },
})

export default KeyboardEffects
