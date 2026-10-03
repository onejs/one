import { One } from 'one'
import { StyleSheet, View } from 'react-native'
import { useTheme } from 'tamagui'
import { TOAST_RADIUS, type ToastSurfaceProps } from './toastGlass'

// ios leg: liquid glass carries the toast's hue as its own tint, which the
// material shifts through its body and rim instead of a flat wash laid over
// it; a plain toast is untinted glass. the outer lift stays on Toast.Item
// outside this clip (a view that clips its bounds cannot draw its own shadow
// on ios). the padding lives on the content (ToastContent).
export function ToastSurface({ tinted, children }: ToastSurfaceProps) {
  const hue = useTheme()['color-6']?.get('web') ?? ''
  return (
    <View
      style={{
        borderRadius: TOAST_RADIUS,
        borderCurve: 'continuous',
        overflow: 'hidden',
      }}
    >
      <One.iOS.Glass
        children={null}
        glassEffect="regular"
        material="regular"
        shape="roundedRectangle"
        cornerRadius={TOAST_RADIUS}
        // the theme ramp is 6 digit hex; at a fifth alpha the hue tints the
        // glass and it stays light and see-through
        tint={tinted ? `${hue}33` : undefined}
        style={StyleSheet.absoluteFill}
      />
      {/* the absolute material layer paints above static-flow siblings, so the
          foreground needs its own positioned layer to stay on top of it */}
      <View style={{ position: 'relative', zIndex: 1, flex: 1 }}>{children}</View>
    </View>
  )
}
