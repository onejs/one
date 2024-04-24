// --------------- global -------------------
// for react-navigation/native NavigationContainer

globalThis['global'] = globalThis

// --------------- URL -------------------

import URLPolyfill from 'url-parse'

try {
  new URL(`https://tamagui.dev/test`).pathname
} catch {
  globalThis['URL'] = URLPolyfill
}
