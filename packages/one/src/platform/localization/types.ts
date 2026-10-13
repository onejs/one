// expo-localization's Locale and Calendar shapes, field for field: unknown
// values are null, never undefined, and text direction, measurement system
// and temperature unit are lowercase string unions.

export interface Locale {
  languageTag: string
  languageCode: string | null
  languageScriptCode: string | null
  regionCode: string | null
  languageRegionCode: string | null
  currencyCode: string | null
  currencySymbol: string | null
  languageCurrencyCode: string | null
  languageCurrencySymbol: string | null
  decimalSeparator: string | null
  digitGroupingSeparator: string | null
  textDirection: 'ltr' | 'rtl'
  measurementSystem: 'metric' | 'us' | 'uk' | null
  temperatureUnit: 'celsius' | 'fahrenheit' | null
}

export interface Calendar {
  /** unicode calendar type, e.g. 'gregory', 'buddhist', 'islamic' */
  calendar: string | null
  timeZone: string | null
  uses24hourClock: boolean | null
  /** first day of the week: sunday is 1, saturday is 7 */
  firstWeekday: number | null
}

export interface Localization {
  /** preferred locales in the user's order, always at least one */
  getLocales(): [Locale, ...Locale[]]
  /** preferred calendars, always at least one */
  getCalendars(): [Calendar, ...Calendar[]]
}
