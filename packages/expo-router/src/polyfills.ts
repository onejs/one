// --------------- global -------------------
// for react-navigation/native NavigationContainer

globalThis['global'] = globalThis

// --------------- URL -------------------

import URL from 'url-parse'

try {
  if (new URL('https://tamagui.dev/test').pathname !== '/test') {
    throw ``
  }
} catch {
  globalThis['URL'] = URL
}
