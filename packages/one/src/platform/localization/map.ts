import type { CalendarInfo, LocaleInfo } from '../specs/OneDevice.nitro'
import type { Calendar, Locale } from './types'

// the native spec carries unknown fields as undefined; expo's shape carries
// them as null. this is the only place that conversion happens.
export function toLocale(info: LocaleInfo): Locale {
  return {
    languageTag: info.languageTag,
    languageCode: info.languageCode ?? null,
    languageScriptCode: info.languageScriptCode ?? null,
    regionCode: info.regionCode ?? null,
    languageRegionCode: info.languageRegionCode ?? null,
    currencyCode: info.currencyCode ?? null,
    currencySymbol: info.currencySymbol ?? null,
    languageCurrencyCode: info.languageCurrencyCode ?? null,
    languageCurrencySymbol: info.languageCurrencySymbol ?? null,
    decimalSeparator: info.decimalSeparator ?? null,
    digitGroupingSeparator: info.digitGroupingSeparator ?? null,
    textDirection: info.textDirection === 'rtl' ? 'rtl' : 'ltr',
    measurementSystem:
      info.measurementSystem === 'metric' ||
      info.measurementSystem === 'us' ||
      info.measurementSystem === 'uk'
        ? info.measurementSystem
        : null,
    temperatureUnit:
      info.temperatureUnit === 'celsius' || info.temperatureUnit === 'fahrenheit'
        ? info.temperatureUnit
        : null,
  }
}

export function toCalendar(info: CalendarInfo): Calendar {
  return {
    calendar: info.calendar ?? null,
    timeZone: info.timeZone ?? null,
    uses24hourClock: info.uses24hourClock ?? null,
    firstWeekday: info.firstWeekday ?? null,
  }
}

// expo guarantees at least one entry. native always answers with the current
// locale, so an empty list means a broken build: fall back to a plain en-US
// snapshot rather than handing callers an empty array to crash on.
export const FALLBACK_LOCALE: Locale = {
  languageTag: 'en-US',
  languageCode: 'en',
  languageScriptCode: null,
  regionCode: 'US',
  languageRegionCode: 'US',
  currencyCode: null,
  currencySymbol: null,
  languageCurrencyCode: null,
  languageCurrencySymbol: null,
  decimalSeparator: null,
  digitGroupingSeparator: null,
  textDirection: 'ltr',
  measurementSystem: null,
  temperatureUnit: null,
}

export const FALLBACK_CALENDAR: Calendar = {
  calendar: 'gregory',
  timeZone: null,
  uses24hourClock: null,
  firstWeekday: null,
}

export function toLocales(infos: LocaleInfo[]): [Locale, ...Locale[]] {
  const locales = infos.map(toLocale)
  return locales.length > 0 ? (locales as [Locale, ...Locale[]]) : [FALLBACK_LOCALE]
}

export function toCalendars(infos: CalendarInfo[]): [Calendar, ...Calendar[]] {
  const calendars = infos.map(toCalendar)
  return calendars.length > 0 ? (calendars as [Calendar, ...Calendar[]]) : [FALLBACK_CALENDAR]
}
