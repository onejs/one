// --------------- global -------------------
// for react-navigation/native NavigationContainer

globalThis['global'] = globalThis

// --------------- URL -------------------

import URL from 'url-parse'

if (typeof window === 'undefined') {
  globalThis['URL'] = URL
}
