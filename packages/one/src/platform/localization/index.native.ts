import { useEffect, useState } from 'react'
import { NitroModules } from 'react-native-nitro-modules'
import type { OneDevice } from '../specs/OneDevice.nitro'
import { toCalendars, toLocales } from './map'
import type { Calendar, Locale, Localization as LocalizationApi } from './types'

export type { Calendar, Locale, LocalizationApi }

// expo-localization's synchronous reads plus its live hooks, backed by the
// OneDevice nitro hybrid object (created on first use and cached). the first
// hook subscription starts the platform locale observer and the last removal
// stops it, so a change can never race the subscription.
let hybrid: OneDevice | undefined

function native(): OneDevice {
  hybrid ??= NitroModules.createHybridObject<OneDevice>('OneDevice')
  return hybrid
}

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
