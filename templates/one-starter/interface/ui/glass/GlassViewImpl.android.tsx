import { One } from 'one'
import { StyleSheet, View, useColorScheme } from 'react-native'
import { YStack, useThemeName } from 'tamagui'
import { glassFor, type GlassViewProps } from './glass'

// android leg: a system blur under the web leg's theme-tinted wash, so the
// surface reads as the same material without liquid glass (the toast's
// recipe). the blur is a plain fill, so the view clips it to its corners; a
// capsule takes its rounding from the caller's style.
export function GlassView({
  children,
  style,
  glassEffectStyle = 'regular',
  cornerRadius,
  accessibilityLabel,
}: GlassViewProps) {
  const dark = useColorScheme() === 'dark'
  const glass = glassFor(useThemeName())
  return (
    <View
      style={[
        style,
        { overflow: 'hidden' },
        cornerRadius === undefined ? null : { borderRadius: cornerRadius },
      ]}
      accessible={Boolean(accessibilityLabel)}
      accessibilityLabel={accessibilityLabel}
    >
      <One.UI.Blur
        intensity={40}
        tint={dark ? 'systemThickMaterialDark' : 'systemThickMaterialLight'}
        style={StyleSheet.absoluteFill}
      />
      <YStack
        bg={glass[glassEffectStyle]}
        position="absolute"
        inset={0}
        pointerEvents="none"
      />
      {children}
    </View>
  )
}
