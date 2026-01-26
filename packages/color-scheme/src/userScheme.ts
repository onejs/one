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

// eagerly init from localStorage on module load (native only - web uses effect for SSR)
function getInitialSetting(): SchemeSetting {
  if (process.env.TAMAGUI_TARGET === 'native') {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(storageKey)
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        return stored
      }
    }
  }
  // web: always return system for SSR compat
  return 'system'
}

function getInitialValue(setting: SchemeSetting): Scheme {
  if (process.env.TAMAGUI_TARGET === 'native') {
    if (setting === 'system') {
      return Appearance.getColorScheme() || 'light'
    }
    return setting
  }
  // web: always return 'light' for SSR compatibility
  return 'light'
}
const initialSetting = getInitialSetting()
let currentSetting: SchemeSetting = initialSetting
let currentValue: Scheme = getInitialValue(initialSetting)

// native: set up listener at module level
if (process.env.TAMAGUI_TARGET === 'native') {
  Appearance.addChangeListener((next) => {
    if (currentSetting === 'system' && next.colorScheme) {
      updateValueFromSystem()
    }
  })
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
    // don't call Appearance.setColorScheme when following system - it breaks the listener
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
      // only call setColorScheme for explicit light/dark
      // calling it breaks the Appearance.addChangeListener for system changes
      if (setting !== 'system') {
        Appearance.setColorScheme(value)
      } else {
        // reset to null to re-enable system tracking
        Appearance.setColorScheme(null)
      }
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
