import React from 'react'
import { View } from 'react-native'

import { RCTKeyboardExtender } from '../../bindings'
import { useWindowDimensions } from '../../hooks'

import type { KeyboardExtenderProps } from '../../typings'
import type { PropsWithChildren } from 'react'

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
  const { width } = useWindowDimensions()

  return (
    <RCTKeyboardExtender enabled={enabled} transparent={transparent}>
      <View style={{ width }}>{children}</View>
    </RCTKeyboardExtender>
  )
}

export default KeyboardExtender
