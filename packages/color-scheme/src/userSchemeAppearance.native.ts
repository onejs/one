import { Appearance } from 'react-native'
import type { Scheme } from './systemScheme'

export function getAppearanceScheme(): Scheme {
  return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light'
}

export function setAppearanceScheme(scheme: Scheme | 'unspecified') {
  Appearance.setColorScheme(scheme)
}

export function addAppearanceChangeListener(listener: () => void) {
  Appearance.addChangeListener(listener)
}
