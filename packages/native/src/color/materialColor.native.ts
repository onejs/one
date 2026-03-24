import { NativeModules, Platform, Appearance } from 'react-native'

const { VxrnNative } = NativeModules

export function Material3DynamicColor(name: string): string | null {
  if (Platform.OS !== 'android' || !VxrnNative) return null
  const scheme = Appearance.getColorScheme()
  return VxrnNative.Material3DynamicColor(name, scheme ?? 'unspecified')
}

export function Material3Color(name: string): string | null {
  if (Platform.OS !== 'android' || !VxrnNative) return null
  const scheme = Appearance.getColorScheme()
  return VxrnNative.Material3Color(name, scheme ?? 'unspecified')
}
