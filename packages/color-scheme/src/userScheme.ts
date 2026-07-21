import { useIsomorphicLayoutEffect } from '@vxrn/use-isomorphic-layout-effect'
import { useMemo, useState } from 'react'
import { getStorageItem, setStorageItem } from './safeStorage'
import { getSystemScheme, type Scheme } from './systemScheme'
import {
  addAppearanceChangeListener,
  getAppearanceScheme,
  setAppearanceScheme,
} from './userSchemeAppearance'

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

// force scheme: when set, locks the scheme and ignores user/system preferences
let _forceScheme: Scheme | null = null

function notifyListeners() {
  listeners.forEach((listener) => {
    listener(currentSetting, currentValue)
  })
}

function restoreUnforcedScheme() {
  const stored = getStorageItem(storageKey) as SchemeSetting | null
  if (stored) {
    currentSetting = stored
    currentValue = stored === 'system' ? resolveValue('system') : stored
    return
  }

  currentSetting = 'system'
  currentValue = resolveValue('system')
}

/**
 * Lock the color scheme to a fixed value. When set, user preferences and system
 * changes are ignored, and `setUserScheme` becomes a no-op.
 * Pass `null` to clear the force and restore normal behavior.
 */
export function setForceScheme(scheme: Scheme | null) {
  const wasForced = _forceScheme

  if (wasForced === scheme) return

  _forceScheme = scheme

  if (scheme) {
    currentSetting = scheme
    currentValue = scheme
  } else if (wasForced) {
    restoreUnforcedScheme()
    startWebListener()
  }
}

export function getForceScheme(): Scheme | null {
  return _forceScheme
}

// eagerly init from localStorage on module load (native only - web uses effect for SSR)
function getInitialSetting(): SchemeSetting {
  if (process.env.TAMAGUI_TARGET === 'native') {
    const stored = getStorageItem(storageKey)
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored
    }
  }
  // web: always return system for SSR compat
  return 'system'
}

function getInitialValue(setting: SchemeSetting): Scheme {
  if (process.env.TAMAGUI_TARGET === 'native') {
    if (setting === 'system') {
      return getAppearanceScheme()
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
  addAppearanceChangeListener(() => {
    if (currentSetting === 'system') {
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
      return getAppearanceScheme()
    }
    return getSystemScheme()
  }
  return setting
}

// Only update the resolved value when system theme changes (don't change setting)
function updateValueFromSystem() {
  if (_forceScheme) return
  const value = resolveValue('system')
  if (value !== currentValue) {
    currentValue = value
    // don't call Appearance.setColorScheme when following system - it breaks the listener
    notifyListeners()
  }
}

function updateScheme(setting: SchemeSetting) {
  if (_forceScheme) return
  const value = setting === 'system' ? resolveValue('system') : setting

  if (value !== currentValue || currentSetting !== setting) {
    currentSetting = setting
    currentValue = value

    if (process.env.TAMAGUI_TARGET === 'native') {
      // only call setColorScheme for explicit light/dark
      // calling it breaks the Appearance.addChangeListener for system changes
      if (setting !== 'system') {
        setAppearanceScheme(value)
      } else {
        // reset to null to re-enable system tracking
        setAppearanceScheme('unspecified')
      }
    }

    notifyListeners()
  }
}

/**
 * Imperatively set the user's color scheme preference.
 * Persists to localStorage and updates all listeners.
 *
 * @param setting - 'system', 'light', or 'dark'
 */
export function setUserScheme(setting: SchemeSetting) {
  if (_forceScheme) return
  setStorageItem(storageKey, setting)
  updateScheme(setting)
}

/**
 * Get the current user scheme setting and resolved value.
 *
 * @returns Object with setting and resolved value
 */
export function getUserScheme(): { setting: SchemeSetting; value: Scheme } {
  if (_forceScheme) return { setting: _forceScheme, value: _forceScheme }
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
  const snapshot = getUserScheme()
  const resolvedState =
    state.setting === snapshot.setting && state.value === snapshot.value
      ? state
      : snapshot

  useIsomorphicLayoutEffect(() => {
    if (!_forceScheme) {
      // restore from localStorage on mount
      const stored = getStorageItem(storageKey) as SchemeSetting | null
      if (stored) {
        updateScheme(stored)
      }
      startWebListener()
    }

    // always subscribe so force→unforce transitions propagate via setForceScheme(null)
    const dispose = onUserSchemeChange((setting, value) => {
      setState({ setting, value })
    })

    return dispose
  }, [])

  return useMemo(
    () => ({
      setting: resolvedState.setting,
      value: resolvedState.value,
      set: setUserScheme,
    }),
    [resolvedState.setting, resolvedState.value]
  )
}
