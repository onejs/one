import { Linking } from 'react-native'

import { getPathFromState } from '../fork/getPathFromState'
import { getStateFromPath } from '../fork/getStateFromPath'

// A custom getInitialURL is used on native to ensure the app always starts at
// the root path if it's launched from something other than a deep link.
// This helps keep the native functionality working like the web functionality.
// For example, if you had a root navigator where the first screen was `/settings` and the second was `/index`
// then `/index` would be used on web and `/settings` would be used on native.
export function getInitialURL(): Promise<string | null> | string {
  return Promise.race<string>([
    (async () => {
      const url = await Linking.getInitialURL()
      // The path will be nullish in bare apps when the app is launched from the home screen.
      // TODO: define some policy around notifications.
      return url ?? getRootURL()
    })(),
    new Promise<string>((resolve) =>
      // Timeout in 150ms if `getInitialState` doesn't resolve
      // Workaround for https://github.com/facebook/react-native/issues/25675
      setTimeout(() => resolve(getRootURL()), 150)
    ),
  ])
}

export function getRootURL(): string {
  return '/'
}

export function getDefaultLinkingPrefixes(): string[] {
  return []
}

export function addEventListener(listener: (url: string) => void) {
  const subscription = Linking.addEventListener('url', ({ url }) => listener(url))

  return () => {
    // https://github.com/facebook/react-native/commit/6d1aca806cee86ad76de771ed3a1cc62982ebcd7
    subscription?.remove?.()
  }
}

export { getStateFromPath, getPathFromState }
