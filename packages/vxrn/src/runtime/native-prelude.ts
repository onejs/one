/**
 * native bundle prelude - minimal globals for React Native.
 * injected via rolldown's `intro` output option.
 * rolldown's devMode handles the module system.
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
global.performance = global.performance || { now: function() { return Date.now(); } };

// ErrorUtils - used by RN's error handling system
if (!global.ErrorUtils) {
  var _handler = null;
  global.ErrorUtils = {
    setGlobalHandler: function(h) { _handler = h; },
    getGlobalHandler: function() { return _handler; },
    reportFatalError: function(e) { if (_handler) _handler(e, true); else throw e; },
    reportError: function(e) { if (_handler) _handler(e, false); },
    applyWithGuard: function(fn, ctx, args) { try { return fn.apply(ctx, args); } catch(e) { this.reportError(e); } },
  };
}

if (typeof process === 'undefined') {
  globalThis.process = { env: {} };
}
process.env.NODE_ENV = ${JSON.stringify(options.dev ? 'development' : 'production')};
process.env.EXPO_OS = ${JSON.stringify(options.platform)};
${options.serverUrl ? `process.env.ONE_SERVER_URL = ${JSON.stringify(options.serverUrl)};` : ''}

// fix: ensure NativeModules proxy doesn't return empty objects for missing modules.
// on bridgeless iOS, global.nativeModuleProxy can return truthy empty objects
// for any module name, which breaks TurboModuleRegistry fallback logic.
// wrapping it to return undefined for modules that are actually empty.
if (global.nativeModuleProxy) {
  var _origProxy = global.nativeModuleProxy;
  global.nativeModuleProxy = new Proxy(_origProxy, {
    get: function(target, prop) {
      var mod = target[prop];
      // if the module is an empty object (no own properties), treat as missing
      if (mod && typeof mod === 'object' && Object.keys(mod).length === 0) return undefined;
      return mod;
    }
  });
}

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

// suppress HMRClient.setup() error from native side
// native calls HMRClient.setup() during bundle load but we don't use Metro HMR
// this intercept catches the error and prevents the red screen
var __origErrorHandler = globalThis.ErrorUtils && globalThis.ErrorUtils.getGlobalHandler && globalThis.ErrorUtils.getGlobalHandler();
if (globalThis.ErrorUtils && globalThis.ErrorUtils.setGlobalHandler) {
  globalThis.ErrorUtils.setGlobalHandler(function(error, isFatal) {
    if (error && error.message && error.message.indexOf('HMRClient') !== -1) {
      // suppress HMRClient errors silently
      return;
    }
    if (__origErrorHandler) __origErrorHandler(error, isFatal);
  });
}

// reanimated compat - these console methods must exist to avoid EXC_BAD_ACCESS crash
console.assert = console.assert || function() {};
console.clear = console.clear || function() {};
console.dir = console.dir || function() {};
console.dirxml = console.dirxml || function() {};
console.profile = console.profile || function() {};
console.profileEnd = console.profileEnd || function() {};
console.table = console.table || function() {};

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
