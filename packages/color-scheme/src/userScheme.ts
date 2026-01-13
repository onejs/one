import { useIsomorphicLayoutEffect } from '@vxrn/use-isomorphic-layout-effect'
import { useState, useMemo } from 'react'
import { Appearance } from 'react-native'
import { getSystemScheme, type Scheme } from './systemScheme'

export type SchemeSetting = 'system' | 'light' | 'dark'

export type UserScheme = {
  /** The user's preference: 'system', 'light', or 'dark' */
  setting: SchemeSetting
  /** The resolved scheme: 'light' or 'dark' */
  value: Scheme
  /** Update the scheme setting */
  set: (setting: SchemeSetting) => void
}

type SchemeListener = (setting: SchemeSetting, value: Scheme) => void

const listeners = new Set<SchemeListener>()
const storageKey = 'vxrn-scheme'

let currentSetting: SchemeSetting = 'system'
let currentValue: Scheme = 'light'

// native: set up listener at module level
if (process.env.TAMAGUI_TARGET === 'native') {
  Appearance.addChangeListener((next) => {
    if (currentSetting === 'system' && next.colorScheme) {
      updateValueFromSystem()
    }
  })

  const cur = Appearance.getColorScheme()
  if (cur && currentSetting === 'system') {
    currentValue = cur
  }
}

// web: lazy listener setup for SSR safety
let isWebListening = false
function startWebListener() {
  if (isWebListening) return
  isWebListening = true

  const matcher =
    typeof window !== 'undefined'
      ? window.matchMedia?.('(prefers-color-scheme: dark)')
      : null

  const onSystemChange = () => {
    if (currentSetting === 'system') {
      updateValueFromSystem()
    }
  }

  onSystemChange()
  matcher?.addEventListener?.('change', onSystemChange)
}

function resolveValue(setting: SchemeSetting): Scheme {
  if (setting === 'system') {
    if (process.env.TAMAGUI_TARGET === 'native') {
      return Appearance.getColorScheme() || 'light'
    }
    return getSystemScheme()
  }
  return setting
}

// Only update the resolved value when system theme changes (don't change setting)
function updateValueFromSystem() {
  const value = resolveValue('system')
  if (value !== currentValue) {
    currentValue = value

    if (process.env.TAMAGUI_TARGET === 'native') {
      Appearance.setColorScheme(value)
    }

    listeners.forEach((l) => {
      l(currentSetting, currentValue)
    })
  }
}

function updateScheme(setting: SchemeSetting) {
  const value = setting === 'system' ? resolveValue('system') : setting

  if (value !== currentValue || currentSetting !== setting) {
    currentSetting = setting
    currentValue = value

    if (process.env.TAMAGUI_TARGET === 'native') {
      Appearance.setColorScheme(value)
    }

    listeners.forEach((l) => {
      l(currentSetting, currentValue)
    })
  }
}

/**
 * Imperatively set the user's color scheme preference.
 * Persists to localStorage and updates all listeners.
 *
 * @param setting - 'system', 'light', or 'dark'
 */
export function setUserScheme(setting: SchemeSetting) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(storageKey, setting)
  }
  updateScheme(setting)
}

/**
 * Get the current user scheme setting and resolved value.
 *
 * @returns Object with setting and resolved value
 */
export function getUserScheme(): { setting: SchemeSetting; value: Scheme } {
  return { setting: currentSetting, value: currentValue }
}

/**
 * Subscribe to color scheme changes. Listener is called immediately with current value.
 *
 * @param listener - Callback receiving (setting, value)
 * @returns Unsubscribe function
 */
export function onUserSchemeChange(listener: SchemeListener) {
  listeners.add(listener)
  listener(currentSetting, currentValue)
  return () => {
    listeners.delete(listener)
  }
}

/**
 * Manage the user's color scheme preference with system detection and persistence.
 *
 * @returns Object with setting ('system'|'light'|'dark'), resolved value ('light'|'dark'), and set function
 * @link https://onestack.dev/docs/api/hooks/useUserScheme
 *
 * @example
 * ```tsx
 * const { setting, value, set } = useUserScheme()
 * // setting = 'system', value = 'dark' (resolved from OS)
 * set('light') // Switch to light mode
 * ```
 */
export function useUserScheme(): UserScheme {
  const [state, setState] = useState(() => getUserScheme())

  useIsomorphicLayoutEffect(() => {
    // restore from localStorage on mount
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(storageKey) as SchemeSetting | null
      if (stored) {
        updateScheme(stored)
      }
    }

    const dispose = onUserSchemeChange((setting, value) => {
      setState({ setting, value })
    })

    startWebListener()

    return dispose
  }, [])

  return useMemo(
    () => ({
      setting: state.setting,
      value: state.value,
      set: setUserScheme,
    }),
    [state.setting, state.value]
  )
}
