import { act, createElement } from 'react'
import TestRenderer from 'react-test-renderer'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Calendar, Locale } from '../src/platform/localization/types'

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }))

vi.mock('react-native-nitro-modules', () => ({
  NitroModules: { createHybridObject: getMock },
}))

import { Localization as WebLocalization } from '../src/platform/localization/index'

async function loadNative() {
  vi.resetModules()
  return await import('../src/platform/localization/index.native')
}

const rawLocale = {
  languageTag: 'pl-PL',
  languageCode: 'pl',
  regionCode: 'PL',
  textDirection: 'ltr',
  measurementSystem: 'metric',
  temperatureUnit: 'celsius',
}

beforeEach(() => {
  getMock.mockReset()
})

describe('Localization reads', () => {
  it('maps undefined native fields to null, expo style', async () => {
    getMock.mockReturnValue({
      getLocales: () => [rawLocale],
      getCalendars: () => [{ calendar: 'gregory' }],
      addLocalizationListener: () => () => {},
    })
    const { Localization } = await loadNative()
    const [locale] = Localization.getLocales()
    expect(locale.languageTag).toBe('pl-PL')
    expect(locale.languageScriptCode).toBeNull()
    expect(locale.currencyCode).toBeNull()
    expect(locale.measurementSystem).toBe('metric')
    expect(locale.temperatureUnit).toBe('celsius')
    const [calendar] = Localization.getCalendars()
    expect(calendar.calendar).toBe('gregory')
    expect(calendar.timeZone).toBeNull()
    expect(calendar.uses24hourClock).toBeNull()
    expect(calendar.firstWeekday).toBeNull()
  })

  it('never returns an empty list', async () => {
    getMock.mockReturnValue({
      getLocales: () => [],
      getCalendars: () => [],
      addLocalizationListener: () => () => {},
    })
    const { Localization } = await loadNative()
    expect(Localization.getLocales()).toHaveLength(1)
    expect(Localization.getLocales()[0].languageTag).toBe('en-US')
    expect(Localization.getCalendars()).toHaveLength(1)
  })

  it('rejects unknown union values to null instead of passing them through', async () => {
    getMock.mockReturnValue({
      getLocales: () => [{ ...rawLocale, measurementSystem: 'imperial', temperatureUnit: 'kelvin' }],
      getCalendars: () => [{}],
      addLocalizationListener: () => () => {},
    })
    const { Localization } = await loadNative()
    const [locale] = Localization.getLocales()
    expect(locale.measurementSystem).toBeNull()
    expect(locale.temperatureUnit).toBeNull()
  })

  it('the web entry answers from Intl with at least one entry', () => {
    const locales = WebLocalization.getLocales()
    expect(locales.length).toBeGreaterThan(0)
    expect(typeof locales[0].languageTag).toBe('string')
    expect(locales[0].currencyCode).toBeNull()
    expect(WebLocalization.getCalendars().length).toBeGreaterThan(0)
  })
})

describe('live locale hooks', () => {
  it('useLocales re-renders when native reports a change and unsubscribes on unmount', async () => {
    let listener: (() => void) | undefined
    const remove = vi.fn()
    let tag = 'en-US'
    getMock.mockReturnValue({
      getLocales: () => [{ ...rawLocale, languageTag: tag }],
      getCalendars: () => [{ calendar: 'gregory' }],
      addLocalizationListener: (next: () => void) => {
        listener = next
        return remove
      },
    })
    const { useLocales } = await loadNative()
    let seen: [Locale, ...Locale[]] | undefined
    function Probe() {
      seen = useLocales()
      return null
    }
    let renderer: TestRenderer.ReactTestRenderer
    await act(async () => {
      renderer = TestRenderer.create(createElement(Probe))
    })
    expect(seen?.[0].languageTag).toBe('en-US')
    tag = 'de-DE'
    await act(async () => listener?.())
    expect(seen?.[0].languageTag).toBe('de-DE')
    await act(async () => renderer.unmount())
    expect(remove).toHaveBeenCalledTimes(1)
  })

  it('useCalendars re-renders when native reports a change', async () => {
    let listener: (() => void) | undefined
    let zone = 'Europe/Warsaw'
    getMock.mockReturnValue({
      getLocales: () => [rawLocale],
      getCalendars: () => [{ calendar: 'gregory', timeZone: zone, firstWeekday: 2 }],
      addLocalizationListener: (next: () => void) => {
        listener = next
        return () => {}
      },
    })
    const { useCalendars } = await loadNative()
    let seen: [Calendar, ...Calendar[]] | undefined
    function Probe() {
      seen = useCalendars()
      return null
    }
    let renderer: TestRenderer.ReactTestRenderer
    await act(async () => {
      renderer = TestRenderer.create(createElement(Probe))
    })
    expect(seen?.[0].timeZone).toBe('Europe/Warsaw')
    expect(seen?.[0].firstWeekday).toBe(2)
    zone = 'America/New_York'
    await act(async () => listener?.())
    expect(seen?.[0].timeZone).toBe('America/New_York')
    await act(async () => renderer.unmount())
  })
})
