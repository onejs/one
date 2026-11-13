import { useEffect, useState } from 'react'
import { deviceNative as native } from '../device/backend'
import { toCalendars, toLocales } from './map'
import type { Calendar, Locale, Localization as LocalizationApi } from './types'

export type { Calendar, Locale, LocalizationApi }

// expo-localization's synchronous reads plus its live hooks, backed by the
// device backend: generated sdk bindings on ios, the OneDevice nitro hybrid
// object everywhere else. the first hook subscription starts the platform
// locale observer and the last removal stops it, so a change can never race
// the subscription.
function getLocales(): [Locale, ...Locale[]] {
  return toLocales(native().getLocales())
}

function getCalendars(): [Calendar, ...Calendar[]] {
  return toCalendars(native().getCalendars())
}

function useLocales(): [Locale, ...Locale[]] {
  const [locales, setLocales] = useState<[Locale, ...Locale[]]>(() => getLocales())
  useEffect(() => {
    setLocales(getLocales())
    return native().addLocalizationListener(() => setLocales(getLocales()))
  }, [])
  return locales
}

function useCalendars(): [Calendar, ...Calendar[]] {
  const [calendars, setCalendars] = useState<[Calendar, ...Calendar[]]>(() => getCalendars())
  useEffect(() => {
    setCalendars(getCalendars())
    return native().addLocalizationListener(() => setCalendars(getCalendars()))
  }, [])
  return calendars
}

export const Localization: LocalizationApi = Object.freeze({ getLocales, getCalendars })
export { useCalendars, useLocales }
