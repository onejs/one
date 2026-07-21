import { getSystemScheme, type Scheme } from './systemScheme'

export function getAppearanceScheme(): Scheme {
  return getSystemScheme()
}

export function setAppearanceScheme(_scheme: Scheme | 'unspecified') {}

export function addAppearanceChangeListener(_listener: () => void) {}
