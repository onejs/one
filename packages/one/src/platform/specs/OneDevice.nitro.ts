import type { HybridObject } from 'react-native-nitro-modules'

export interface DeviceInfo {
  model: string
  systemName: string
  systemVersion: string
  interfaceIdiom: string
  isSimulator: boolean
  vendorIdentifier?: string
}

export interface LocalizationInfo {
  localeIdentifier: string
  preferredLanguages: string[]
  calendarIdentifier: string
  timeZoneIdentifier: string
  timeZoneOffsetSeconds: number
  currencyCode?: string
}

// expo-localization's Locale, one per preferred language. unknown fields
// are undefined here and become null in the js entry, matching expo.
export interface LocaleInfo {
  languageTag: string
  languageCode?: string
  languageScriptCode?: string
  regionCode?: string
  languageRegionCode?: string
  currencyCode?: string
  currencySymbol?: string
  languageCurrencyCode?: string
  languageCurrencySymbol?: string
  decimalSeparator?: string
  digitGroupingSeparator?: string
  textDirection: string
  measurementSystem?: string
  temperatureUnit?: string
}

// expo-localization's Calendar. firstWeekday numbers sunday as 1.
export interface CalendarInfo {
  calendar?: string
  timeZone?: string
  uses24hourClock?: boolean
  firstWeekday?: number
}

export interface OneDevice extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  getInfo(): Promise<DeviceInfo>
  getLocalizationInfo(): Promise<LocalizationInfo>
  // synchronous like expo-localization: the platform answers without i/o.
  getLocales(): LocaleInfo[]
  getCalendars(): CalendarInfo[]
  // fires with no payload when the system locale or time zone changes; the
  // first listener starts the platform observer and the last removal stops
  // it, so a change can never race the subscription. returns its remover.
  addLocalizationListener(listener: () => void): () => void
}
