import { One } from 'one'
import { StyleSheet, View, useColorScheme } from 'react-native'
import { YStack, useThemeName } from 'tamagui'
import { glassFor } from '../glass/glass'
import { TOAST_RADIUS, type ToastSurfaceProps } from './toastGlass'

// android leg: system blur with the same theme-tinted wash as ios, so the
// card reads as the same material without liquid glass. the blur tint follows
// the system appearance (FeedbackGlass precedent); the wash follows the theme,
// so error toasts still tint red. padding lives on the content (ToastContent).
export function ToastSurface({ children }: ToastSurfaceProps) {
  const dark = useColorScheme() === 'dark'
  const glass = glassFor(useThemeName())
  return (
    <View
      style={{
        borderRadius: TOAST_RADIUS,
        borderCurve: 'continuous',
        overflow: 'hidden',
      }}
    >
      <One.UI.Blur
        intensity={40}
        tint={dark ? 'systemThickMaterialDark' : 'systemThickMaterialLight'}
        style={StyleSheet.absoluteFill}
      />
      <YStack bg={glass.regular} position="absolute" inset={0} pointerEvents="none" />
      {/* the absolute material layers paint above static-flow siblings, so the
          foreground needs its own positioned layer to stay on top of them */}
      <View style={{ position: 'relative', zIndex: 1, flex: 1 }}>{children}</View>
    </View>
  )
}
