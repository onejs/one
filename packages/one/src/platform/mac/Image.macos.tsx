import { StyleSheet } from 'react-native'
import type { ColorValue, ViewProps } from 'react-native'
import type { SFSymbolName } from '../generated/sfSymbolNames'
import NativeImage from './OneMacImageNativeComponent'

export type ImageProps = Omit<ViewProps, 'children'> & {
  systemName: SFSymbolName
  /** symbol point size, centered in a default square layout. defaults to 16. */
  size?: number
  /** defaults to the appearance-aware AppKit label color. */
  tintColor?: ColorValue
}

export function Image({
  systemName,
  size = 16,
  tintColor,
  accessibilityLabel,
  accessible = !!accessibilityLabel,
  style,
  ...props
}: ImageProps) {
  if (typeof systemName !== 'string' || !systemName)
    throw new Error('One.macOS.Image needs a systemName')
  if (!Number.isFinite(size) || size <= 0)
    throw new Error('One.macOS.Image size must be a positive finite number')
  const bounds = StyleSheet.flatten(style)
  return (
    <NativeImage
      {...props}
      style={style}
      fitToBounds={bounds?.width != null && bounds?.height != null}
      systemName={systemName}
      size={size}
      tintColor={tintColor}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      accessible={accessible}
    />
  )
}
