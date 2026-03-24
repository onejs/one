/**
 * native bundle prelude - minimal globals for React Native.
 * injected via rolldown's `intro` output option.
 *
 * this replaces the 375-line react-native-template.js
 * since rolldown's devMode handles the module system.
 */

// this is output as a raw string, not compiled as a module
export function getNativePrelude(options: {
  dev: boolean
  platform: string
  serverUrl?: string
}): string {
  return `
var __BUNDLE_START_TIME__ = globalThis.nativePerformanceNow ? nativePerformanceNow() : Date.now();

var global = typeof globalThis !== 'undefined' ? globalThis
  : typeof global !== 'undefined' ? global
  : typeof window !== 'undefined' ? window
  : this;

globalThis.global = global;
globalThis.__DEV__ = ${options.dev};

// react native polyfills
global.__FUSEBOX_HAS_FULL_CONSOLE_SUPPORT__ = false;
global.Event = global.Event || function() { return this; };
global.dispatchEvent = global.dispatchEvent || function() {};

if (typeof process === 'undefined') {
  globalThis.process = { env: {} };
}
process.env.NODE_ENV = ${JSON.stringify(options.dev ? 'development' : 'production')};
process.env.EXPO_OS = ${JSON.stringify(options.platform)};
${options.serverUrl ? `process.env.ONE_SERVER_URL = ${JSON.stringify(options.serverUrl)};` : ''}

// react refresh stubs (overridden by react-refresh plugin in dev)
${
  options.dev
    ? `
var $RefreshReg$ = function() {};
var $RefreshSig$ = function() { return function(v) { return v; }; };
`
    : ''
}
`.trim()
}
