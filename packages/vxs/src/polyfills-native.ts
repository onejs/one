// import 'es6-symbol/implement'

// import SymbolIterator from 'core-js/fn/symbol/iterator'
// import 'core-js/es/map/index.js'
// import 'core-js/es/set/index.js'
// import 'core-js/es/array/find.js'

// import * as CoreSymbol from 'core-js/es/symbol/index.js'

// globalThis.Symbol ||= CoreSymbol

// console.log('????????????????????????', CoreSymbol, CoreSymbol.iterator, globalThis.Symbol)

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
