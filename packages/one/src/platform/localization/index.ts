import { useEffect, useState } from 'react'
import { FALLBACK_CALENDAR, FALLBACK_LOCALE } from './map'
import type { Calendar, Locale, Localization as LocalizationApi } from './types'

export type { Calendar, Locale, LocalizationApi }

// web entry. same shape as the native entry, read from Intl and navigator:
// currency and measurement are not exposed on the web, so they stay null as
// in expo-localization. on the server every read is the en-US fallback, so a
// route module that imports this renders under SSR and SSG.
function localeFor(tag: string): Locale {
  try {
    const parsed = new Intl.Locale(tag)
    const numbers = new Intl.NumberFormat(tag).formatToParts(1234567.89)
    const part = (type: string) => numbers.find((entry) => entry.type === type)?.value ?? null
    // Intl.Locale textInfo and weekInfo are stage-3: read them structurally.
    const direction = (parsed as { textInfo?: { direction?: string } }).textInfo?.direction
    return {
      languageTag: parsed.baseName,
      languageCode: parsed.language ?? null,
      languageScriptCode: parsed.script ?? null,
      regionCode: parsed.region ?? null,
      languageRegionCode: parsed.region ?? null,
      currencyCode: null,
      currencySymbol: null,
      languageCurrencyCode: null,
      languageCurrencySymbol: null,
      decimalSeparator: part('decimal'),
      digitGroupingSeparator: part('group'),
      textDirection: direction === 'rtl' ? 'rtl' : 'ltr',
      measurementSystem: null,
      temperatureUnit: null,
    }
  } catch {
    return { ...FALLBACK_LOCALE, languageTag: tag }
  }
}

function getLocales(): [Locale, ...Locale[]] {
  if (typeof navigator === 'undefined' || !navigator.languages?.length) {
    return [FALLBACK_LOCALE]
  }
  const locales = [...navigator.languages].map(localeFor)
  return locales.length > 0 ? (locales as [Locale, ...Locale[]]) : [FALLBACK_LOCALE]
}

function getCalendars(): [Calendar, ...Calendar[]] {
  if (typeof Intl === 'undefined') return [FALLBACK_CALENDAR]
  try {
    const options = new Intl.DateTimeFormat().resolvedOptions()
    const parsed = new Intl.Locale(options.locale) as Intl.Locale & {
      hourCycle?: string
      weekInfo?: { firstDay?: number }
    }
    const firstDay = parsed.weekInfo?.firstDay
    return [
      {
        calendar: options.calendar ?? null,
        timeZone: options.timeZone ?? null,
        uses24hourClock:
          parsed.hourCycle === undefined ? null : parsed.hourCycle === 'h23' || parsed.hourCycle === 'h24',
        // weekInfo numbers monday as 1; expo numbers sunday as 1.
        firstWeekday: firstDay === undefined ? null : (firstDay % 7) + 1,
      },
    ]
  } catch {
    return [FALLBACK_CALENDAR]
  }
}

function subscribe(refresh: () => void): (() => void) | undefined {
  if (typeof window === 'undefined') return undefined
  window.addEventListener('languagechange', refresh)
  return () => window.removeEventListener('languagechange', refresh)
}

function useLocales(): [Locale, ...Locale[]] {
  const [locales, setLocales] = useState<[Locale, ...Locale[]]>(() => getLocales())
  useEffect(() => subscribe(() => setLocales(getLocales())), [])
  return locales
}

function useCalendars(): [Calendar, ...Calendar[]] {
  const [calendars, setCalendars] = useState<[Calendar, ...Calendar[]]>(() => getCalendars())
  useEffect(() => subscribe(() => setCalendars(getCalendars())), [])
  return calendars
}

export const Localization: LocalizationApi = Object.freeze({ getLocales, getCalendars })
export { useCalendars, useLocales }
