import { View, useThemeName } from 'tamagui'
import { glassFor, type GlassViewProps } from './glass'

// web leg: the kit's css glass (glass.ts). ios draws system liquid glass and
// android a system blur (GlassViewImpl.ios.tsx, GlassViewImpl.android.tsx), from the same props.
export function GlassView({
  children,
  style,
  glassEffectStyle = 'regular',
  cornerRadius,
  accessibilityLabel,
}: GlassViewProps) {
  const glass = glassFor(useThemeName())
  return (
    <View
      style={style as never}
      bg={glass[glassEffectStyle]}
      backdropFilter={glass.backdrop}
      boxShadow={glass.rim}
      rounded={cornerRadius ?? 9999}
      aria-label={accessibilityLabel}
    >
      {children}
    </View>
  )
}
