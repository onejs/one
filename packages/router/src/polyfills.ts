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

// --------------- Promise.withResolver -------------------

Promise.withResolvers ||
  // @ts-ignore
  (Promise.withResolvers = function withResolvers() {
    let a
    let b
    let c = new this((resolve, reject) => {
      a = resolve
      b = reject
    })
    return { resolve: a, reject: b, promise: c }
  })
