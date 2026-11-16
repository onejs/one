import React from 'react'
import { Animated } from 'react-native'

import { KeyboardBackgroundView } from '../../bindings'
import { KeyboardStickyView } from '../../components'
import { useKeyboardAnimation } from '../../hooks'

import type { KeyboardExtenderProps } from '../../typings'
import type { PropsWithChildren } from 'react'

const AnimatedKeyboardBackgroundView =
  Animated.createAnimatedComponent(KeyboardBackgroundView)

/**
 * A component that embeds its children into the keyboard thus enhancing keyboard functionality.
 *
 * @param props - Component props.
 * @returns A view component that renders inside the keyboard above all system buttons.
 * @example
 * ```tsx
 * <KeyboardExtender>
 *   <Button>10$</Button>
 *   <Button>20$</Button>
 *   <Button>50$</Button>
 * </KeyboardExtender>
 * ```
 */
const KeyboardExtender = (props: PropsWithChildren<KeyboardExtenderProps>) => {
  const { children, enabled = true, transparent = false } = props
  const { progress } = useKeyboardAnimation()
  // Android's predictive-back preview stays near 0.9 progress. Finish fading
  // earlier to keep the extender opaque, allowing for pixel rounding.
  const opacity = progress.interpolate({
    inputRange: [0, 0.8],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  })
  const Container = transparent ? Animated.View : AnimatedKeyboardBackgroundView

  return (
    <KeyboardStickyView enabled={enabled}>
      <Container style={{ opacity }}>{children}</Container>
    </KeyboardStickyView>
  )
}

export default KeyboardExtender
