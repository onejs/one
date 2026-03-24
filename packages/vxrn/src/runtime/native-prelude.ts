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
global.window = global.window || global;
global.self = global.self || global;
global.navigator = global.navigator || { product: 'ReactNative', userAgent: '' };

if (typeof process === 'undefined') {
  globalThis.process = { env: {} };
}
process.env.NODE_ENV = ${JSON.stringify(options.dev ? 'development' : 'production')};
process.env.EXPO_OS = ${JSON.stringify(options.platform)};
${options.serverUrl ? `process.env.ONE_SERVER_URL = ${JSON.stringify(options.serverUrl)};` : ''}

// polyfill setImmediate (used by react-native internals)
if (typeof globalThis.setImmediate === 'undefined') {
  globalThis.setImmediate = function(fn) { return setTimeout(fn, 0); };
  globalThis.clearImmediate = function(id) { clearTimeout(id); };
}

// polyfill URLSearchParams early (before whatwg-fetch checks for it)
// RN's polyfillGlobal sets this up later but some modules check at import time
if (typeof globalThis.URLSearchParams === 'undefined') {
  // minimal URLSearchParams polyfill - will be overridden by RN's proper one
  globalThis.URLSearchParams = function URLSearchParams(init) {
    this._params = {};
    if (typeof init === 'string') {
      init.replace(/^\\?/, '').split('&').forEach(function(p) {
        var kv = p.split('=');
        if (kv[0]) this._params[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1] || '');
      }.bind(this));
    }
  };
  globalThis.URLSearchParams.prototype.get = function(k) { return this._params[k] || null; };
  globalThis.URLSearchParams.prototype.toString = function() {
    return Object.keys(this._params).map(function(k) { return encodeURIComponent(k) + '=' + encodeURIComponent(this._params[k]); }.bind(this)).join('&');
  };
}

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
