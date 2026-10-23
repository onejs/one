import type { ColorValue, ViewProps } from 'react-native'
import type { SFSymbolName } from '../generated/sfSymbolNames'
import NativeImage from './OneMacImageNativeComponent'

export type ImageProps = Omit<ViewProps, 'children'> & {
  systemName: SFSymbolName
  /** symbol point size and default layout size. defaults to 16. */
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
  ...props
}: ImageProps) {
  if (typeof systemName !== 'string' || !systemName)
    throw new Error('One.macOS.Image needs a systemName')
  if (!Number.isFinite(size) || size <= 0)
    throw new Error('One.macOS.Image size must be a positive finite number')
  return (
    <NativeImage
      {...props}
      systemName={systemName}
      size={size}
      tintColor={tintColor}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      accessible={accessible}
    />
  )
}
