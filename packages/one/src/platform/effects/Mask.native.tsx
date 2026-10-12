import { isValidElement } from 'react'
import { StyleSheet, View } from 'react-native'
import NativeMask from '../specs/OneNativeMaskNativeComponent'
import type { MaskProps } from './types'

let warnedInvalidMask = false

// arbitrary-element mask, masked-view compatible: the mask subtree mounts
// as the first child (absolute fill, no touches) and the primitive applies
// it as the content's alpha mask without displaying it.
export function Mask(props: MaskProps) {
  const { maskElement, style, children, ...viewProps } = props
  if (!isValidElement(maskElement)) {
    if (!warnedInvalidMask) {
      warnedInvalidMask = true
      console.warn(
        'Mask: invalid `maskElement` prop was passed to Mask. ' +
          'expected a React element. no mask will render.'
      )
    }
    return (
      <View style={style} {...viewProps}>
        {children}
      </View>
    )
  }
  return (
    <NativeMask style={style} {...viewProps}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {maskElement}
      </View>
      {children}
    </NativeMask>
  )
}
