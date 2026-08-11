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
