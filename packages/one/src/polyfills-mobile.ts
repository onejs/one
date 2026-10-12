// core-js 3.47.0's make-built-in patches Function.prototype.toString with a
// fallback to inspect-source. metro inline requires can defer inspect-source
// until that fallback runs, when it captures the patched method and recurses.
// evaluate inspect-source before another polyfill can load make-built-in.
import 'core-js/internals/inspect-source'

// hermes releases bundled with react native do not provide every ES2023
// change-array-by-copy method. install them before native app modules load.
import 'core-js/actual/array/to-sorted'
import 'core-js/actual/array/to-reversed'
import 'core-js/actual/array/to-spliced'
import 'core-js/actual/array/with'

// --------------- global -------------------
// for react-navigation/native NavigationContainer

globalThis['global'] = globalThis

// --------------- web streams -------------------
// expo fetch reads ReadableStream while normalizing FormData request bodies

import 'web-streams-polyfill/polyfill/es5'

// --------------- TextDecoder -------------------
// for viem and other web3/crypto packages that need TextDecoder on React Native

import { TextDecoder as TextDecoderPolyfill } from '@bacons/text-decoder'

globalThis['TextDecoder'] ||= TextDecoderPolyfill

// --------------- structuredClone -------------------

import structuredClone from '@ungap/structured-clone'

globalThis['structuredClone'] ||= structuredClone

// --------------- structuredClone -------------------

globalThis['requestAnimationFrame'] ||= setTimeout

// --------------- Symbol.asyncIterator -------------------

import '@azure/core-asynciterator-polyfill'

// --------------- URL -------------------

import 'core-js/actual/url'
import 'core-js/actual/url-search-params'

// import URLPolyfill from 'url-parse'
// try {
//   new URL(`https://tamagui.dev/test`).pathname
// } catch {
//   globalThis['URL'] = URLPolyfill
// }

// --------------- Promise.withResolver -------------------

import { promiseWithResolvers } from './utils/promiseWithResolvers'

Promise.withResolvers || (Promise.withResolvers = promiseWithResolvers)

// --------------- fetch -------------------
// react native's fetch buffers whole responses; install the OneFetch-backed
// fetch whose response.body streams. needs the web streams and TextDecoder
// installed above.

import { installFetch } from './platform/fetch'

installFetch()

// --------------- crypto -------------------
// Hermes ships no WebCrypto. install getRandomValues + randomUUID backed
// by the OneCrypto c++ hybrid object (arc4random_buf on both platforms), only
// filling the pieces the runtime lacks.

import { installCrypto } from './platform/crypto'

installCrypto()
