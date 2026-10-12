import { NativeModules, Platform, Appearance } from 'react-native'

const { One } = NativeModules

export function Material3DynamicColor(name: string): string | null {
  if (Platform.OS !== 'android' || !One) return null
  const scheme = Appearance.getColorScheme()
  return One.Material3DynamicColor(name, scheme ?? 'unspecified')
}

export function Material3Color(name: string): string | null {
  if (Platform.OS !== 'android' || !One) return null
  const scheme = Appearance.getColorScheme()
  return One.Material3Color(name, scheme ?? 'unspecified')
}
