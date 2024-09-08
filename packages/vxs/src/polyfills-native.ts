// --------------- global -------------------
// for react-navigation/native NavigationContainer

globalThis['global'] = globalThis

// --------------- URL -------------------

import URLPolyfill from 'url-parse'
import { promiseWithResolvers } from './utils/promiseWithResolvers'

try {
  new URL(`https://tamagui.dev/test`).pathname
} catch {
  globalThis['URL'] = URLPolyfill
}

// --------------- Promise.withResolver -------------------

Promise.withResolvers ||
  // @ts-ignore
  (Promise.withResolvers = promiseWithResolvers)
