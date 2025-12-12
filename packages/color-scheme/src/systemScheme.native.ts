import { useState, useEffect } from 'react'
import { Appearance } from 'react-native'

export type Scheme = 'light' | 'dark'

export function getSystemScheme(): Scheme {
  return Appearance.getColorScheme() || 'light'
}

export function useSystemScheme(): Scheme {
  const [scheme, setScheme] = useState<Scheme>(getSystemScheme)

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setScheme(colorScheme || 'light')
    })
    return () => subscription.remove()
  }, [])

  return scheme
}
