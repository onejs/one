import { View } from 'react-native'
import NativeBlur from '../specs/OneNativeBlurNativeComponent'
import type { BlurProps } from './types'

// regular backdrop blur, expo-blur compatible: intensity in expo units
// (0-100, default 50) normalized to 0-1 for the primitive, tint passed
// through by name. children render sharp on top of the blur.
export function Blur(props: BlurProps) {
  const { intensity = 50, tint = 'default', style, children, ...viewProps } = props
  return (
    <View style={[{ backgroundColor: 'transparent' }, style]} {...viewProps}>
      <NativeBlur
        tint={tint}
        intensity={Math.max(0, Math.min(1, intensity / 100))}
        style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
      />
      {children}
    </View>
  )
}
