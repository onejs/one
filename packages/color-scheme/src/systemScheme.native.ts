import { useState, useEffect } from 'react'
import { Appearance, AppState, type AppStateStatus } from 'react-native'

export type Scheme = 'light' | 'dark'

export function getSystemScheme(): Scheme {
  return Appearance.getColorScheme() || 'light'
}

export function useSystemScheme(): Scheme {
  const [scheme, setScheme] = useState<Scheme>(getSystemScheme)

  useEffect(() => {
    // Listen for appearance changes while app is active
    const appearanceSubscription = Appearance.addChangeListener(({ colorScheme }) => {
      setScheme(colorScheme || 'light')
    })

    // Also check when app comes back to foreground, as appearance change
    // events may not fire if the theme changed while app was in background
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        const currentScheme = getSystemScheme()
        setScheme((prev) => (prev !== currentScheme ? currentScheme : prev))
      }
    }

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange)

    return () => {
      appearanceSubscription.remove()
      appStateSubscription.remove()
    }
  }, [])

  return scheme
}
