import { getPathFromState } from '../fork/getPathFromState'
import { getStateFromPath } from '../fork/getStateFromPath'

export function getInitialURL(): string {
  if (typeof window === 'undefined') {
    return ''
  }
  return window.location?.href || ''
}

export function getRootURL(): string {
  return '/'
}

export function addEventListener(listener: (url: string) => void) {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const callback = () => {
    listener(window.location.href)
  }

  window.addEventListener('popstate', callback)

  return () => {
    window.removeEventListener('popstate', callback)
  }
}

export { getStateFromPath, getPathFromState }
