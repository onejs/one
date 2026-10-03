import { One } from 'one'
import { StyleSheet, View } from 'react-native'
import type { GlassViewProps } from './glass'

// ios leg: system liquid glass, a capsule unless given corners. the material
// is an absolute layer, so the content needs no wrapper of its own.
export function GlassView({
  children,
  style,
  glassEffectStyle = 'regular',
  cornerRadius,
  accessibilityLabel,
}: GlassViewProps) {
  return (
    <View
      style={style}
      accessible={Boolean(accessibilityLabel)}
      accessibilityLabel={accessibilityLabel}
    >
      <One.iOS.Glass
        children={null}
        glassEffect={glassEffectStyle}
        material={glassEffectStyle === 'clear' ? 'thin' : 'regular'}
        shape={cornerRadius === undefined ? 'capsule' : 'roundedRectangle'}
        cornerRadius={cornerRadius}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  )
}
