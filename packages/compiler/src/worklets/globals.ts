export const JS_GLOBALS = new Set([
  // Value properties
  'globalThis',
  'Infinity',
  'NaN',
  'undefined',
  // Function properties
  'eval',
  'isFinite',
  'isNaN',
  'parseFloat',
  'parseInt',
  'decodeURI',
  'decodeURIComponent',
  'encodeURI',
  'encodeURIComponent',
  'escape',
  'unescape',
  // Fundamental objects
  'Object',
  'Function',
  'Boolean',
  'Symbol',
  // Error objects
  'Error',
  'AggregateError',
  'EvalError',
  'RangeError',
  'ReferenceError',
  'SyntaxError',
  'TypeError',
  'URIError',
  'InternalError',
  // Numbers and dates
  'Number',
  'BigInt',
  'Math',
  'Date',
  // Text processing
  'String',
  'RegExp',
  // Indexed collections
  'Array',
  'Int8Array',
  'Uint8Array',
  'Uint8ClampedArray',
  'Int16Array',
  'Uint16Array',
  'Int32Array',
  'Uint32Array',
  'BigInt64Array',
  'BigUint64Array',
  'Float32Array',
  'Float64Array',
  // Keyed collections
  'Map',
  'Set',
  'WeakMap',
  'WeakSet',
  // Structured data
  'ArrayBuffer',
  'SharedArrayBuffer',
  'DataView',
  'Atomics',
  'JSON',
  // Managing memory
  'WeakRef',
  'FinalizationRegistry',
  // Control abstraction objects
  'Iterator',
  'AsyncIterator',
  'Promise',
  'GeneratorFunction',
  'AsyncGeneratorFunction',
  'Generator',
  'AsyncGenerator',
  'AsyncFunction',
  // Reflection
  'Reflect',
  'Proxy',
  // Internationalization
  'Intl',
])

export const DEFAULT_GLOBALS = new Set([
  ...JS_GLOBALS,
  // Environment / Runtime
  'null',
  'this',
  'global',
  'window',
  'self',
  'console',
  'performance',
  'arguments',
  'require',
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'queueMicrotask',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'setTimeout',
  'clearTimeout',
  'setImmediate',
  'clearImmediate',
  'setInterval',
  'clearInterval',
  'HermesInternal',
  '_WORKLET',
  // Reanimated installs these in the UI runtime. Capturing them on the JS
  // thread fails before its value unpacker can initialize (Reanimated 3).
  'ReanimatedError',
  '__reanimatedLoggerConfig',
  '_IS_FABRIC',
  '_log',
  '_toString',
  '_scheduleHostFunctionOnJS',
  '_scheduleRemoteFunctionOnJS',
  '_scheduleOnRuntime',
  '_makeShareableClone',
  '_updatePropsPaper',
  '_updatePropsFabric',
  '_measurePaper',
  '_measureFabric',
  '_scrollToPaper',
  '_dispatchCommandPaper',
  '_dispatchCommandFabric',
  '_setGestureState',
  '_notifyAboutProgress',
  '_notifyAboutEnd',
  '_runOnUIQueue',
  '_getAnimationTimestamp',
])

export function createGlobalsSet(
  customGlobals?: string[],
  strictGlobal?: boolean
): Set<string> {
  const set = new Set<string>()
  if (!strictGlobal) {
    for (const g of DEFAULT_GLOBALS) {
      set.add(g)
    }
  }
  if (customGlobals) {
    for (const g of customGlobals) {
      set.add(g)
    }
  }
  return set
}
