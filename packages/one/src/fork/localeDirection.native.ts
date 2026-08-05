import type { LocaleDirection } from '@react-navigation/native'
import { I18nManager } from 'react-native'

export function getLocaleDirection(): LocaleDirection {
  return I18nManager.getConstants().isRTL ? 'rtl' : 'ltr'
}
