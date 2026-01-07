import { useIsomorphicLayoutEffect } from '@vxrn/use-isomorphic-layout-effect'
import { useState } from 'react'

export type Scheme = 'light' | 'dark'

const media =
  typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null

export function getSystemScheme(): Scheme {
  return media?.matches ? 'dark' : 'light'
}

export function useSystemScheme(): Scheme {
  const [scheme, setScheme] = useState<Scheme>('light')

  useIsomorphicLayoutEffect(() => {
    setScheme(getSystemScheme())
    const onChange = () => setScheme(getSystemScheme())
    media?.addEventListener('change', onChange)
    return () => media?.removeEventListener('change', onChange)
  }, [])

  return scheme
}
