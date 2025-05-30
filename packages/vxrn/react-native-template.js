const global =
  typeof globalThis !== 'undefined'
    ? globalThis
    : typeof global !== 'undefined'
    ? global
    : typeof window !== 'undefined'
    ? window
    : this

globalThis['global'] = global
global['react'] = {}
global['exports'] = {}
global['module'] = {}
global['__DEV__'] = process.env.__DEV__
global['___modules___'] = {}
global['___vxrnAbsoluteToRelative___'] = {}

// Prevents the `HMRClient.unstable_notifyFuseboxConsoleEnabled is not a function (it is undefined)` error
global.__FUSEBOX_HAS_FULL_CONSOLE_SUPPORT__ = false

global['Event'] =
  global['Event'] ||
  function () {
    return this
  }
global['dispatchEvent'] = global['dispatchEvent'] || (() => {})

globalThis['__cachedModules'] = {
  // potentially, but need to verify other things first:
  // // framer-motion fix
  // '@emotion/is-prop-valid': {
  //   default: {},
  // },
}

globalThis['__RN_INTERNAL_MODULE_REQUIRES_MAP__'] = {}

if (typeof process === 'undefined') {
  globalThis['process'] = {
    env: {},
  }
}

process.env.EXPO_OS = __VXRN_PLATFORM__

function printError(err) {
  return `${err instanceof Error ? `${err.message}\n${err.stack}` : err}`
}

const __runningModules = new Map()

const getRunningModulesPrint = () => [...__runningModules.keys()].join(' > ')

function __getRequire(absPath, parent) {
  absPath = ___vxrnAbsoluteToRelative___[absPath] || absPath

    // START WORKAROUND
    // Since during HMR, `getVitePath` is used and it'll always return with `.js` extension while turning relative paths to absolute paths (see: https://github.com/onejs/one/blob/v1.1.432/packages/vxrn/src/utils/getVitePath.ts#L33),
    // we need to check for other extensions as well.
  if (absPath.endsWith('.js')) {
    for (const ext of ['.jsx', '.ts', '.tsx']) {
      for (const platformExt of ['', `.${__VXRN_PLATFORM__.toLowerCase()}`, `.native`]) {
        const possibleAbsPath = absPath.replace(/\.js$/, `${platformExt}${ext}`)
        if (___vxrnAbsoluteToRelative___[possibleAbsPath]) {
          absPath = ___vxrnAbsoluteToRelative___[possibleAbsPath]
        }
      }
    }
  }
    // END WORKAROUND

  if (!__cachedModules[absPath]) {
    const runModule = ___modules___[absPath]

    // do not run again if the module is already running, avoids stack overflow on circular dependencies
    if (__runningModules.has(absPath)) {
      console.info('‼️ circular dependency:', absPath, 'imported from', parent, ':')
      console.info(' running modules:', getRunningModulesPrint())
      // TODO we can probably print a circular dependency warning for this
      return __runningModules.get(absPath).exports
    }

    if (runModule) {
      const mod = { exports: {} }
      __runningModules.set(absPath, mod)

      try {
        runModule(mod.exports, mod)
      } catch (err) {
        throw new Error(
          `Error running module (parent: ${parent}): "${absPath}"\n${printError(err)}`
        )
      } finally {
        __runningModules.delete(absPath)
      }

      __cachedModules[absPath] = mod.exports || mod
    }
  }

  return __cachedModules[absPath]
}

const __specialRequireMap = globalThis.__vxrnPrebuildSpecialRequireMap || {
  'react-native': `.vxrn/react-native.${__VXRN_PLATFORM__.toLowerCase()}.js`,
  react: '.vxrn/react.js',
  'react/jsx-runtime': '.vxrn/react-jsx-runtime.js',
  'react/jsx-dev-runtime': '.vxrn/react-jsx-runtime.js',
}

// WORKAROUND: react-native-reanimated may be dynamically imported by react-native-gesture-handler, which the import path will not be transformed. Doing this so `require('react-native-reanimated')` can work.
// See: https://github.com/software-mansion/react-native-gesture-handler/blob/2.23.0/src/handlers/gestures/reanimatedWrapper.ts#L33
__specialRequireMap['react-native-reanimated'] = 'react-native-reanimated/src/index.js'

const nodeImports = {
  fs: true,
  path: true,
  os: true,
  child_process: true,
}

function createRequire(importer, importsMap) {
  if (!importsMap) {
    console.error(`No imports map given from ${importer}\n${new Error().stack}`)
  }

  return function require(_mod) {
    const output = getRequire(importer, importsMap, _mod)

    // this adds a hacky compat with new Rollup commonjs transform
    // going from vite 6.0.0-beta.1 to beta.5 needed this
    if (output && typeof output === 'object' && !('__require' in output)) {
      return new Proxy(output, {
        get(target, key) {
          // if (!Reflect.has(target, key)) {
          if (key === '__require') {
            return () => output
          }
          // }

          return Reflect.get(target, key)
        },
      })
    }

    return output
  }
}

function getRequire(importer, importsMap, _mod) {
  if (_mod.endsWith('.css')) {
    console.info(`Ignoring css import: ${_mod}`)
    return {}
  }

  const getErrorDetails = (withStack) => {
    return `Running modules: ${getRunningModulesPrint()}

In importsMap: ${JSON.stringify(importsMap, null, 2)}

${
  /* process.env.DEBUG?.startsWith('tamagui') ? debugExtraDetail : '' // Will break Android: property 'process' doesn't exist */ ''
}

${
  withStack
    ? `Stack:

${new Error().stack
  .split('\n')
  .map((l) => `    ${l}`)
  .join('\n')}`
    : ''
}

--------------`
  }

  try {
    if (_mod === 'one' || _mod === 'one' || _mod.endsWith('one/dist/esm/index.mjs')) {
      // TODO this should be passed in not hardcoded
      const found =
        __getRequire('packages/one/dist/esm/index.js', _mod) ||
        // this is only for developing links module in ~/vxrn, can remove later
        __getRequire('vxrn/packages/one/dist/esm/index.js', _mod) ||
        __getRequire('one/dist/esm/index.native.js') ||
        __getRequire('one/dist/esm/index.native.js') ||
        __getRequire('packages/one/dist/esm/index.native.js', _mod) ||
        __getRequire('vxrn/packages/one/dist/esm/index.native.js', _mod)

      if (found) return found

      // Try harder
      const possibleId = Object.keys(___modules___).find((m) =>
        /(one|one)\/dist\/esm\/index\.native\.js$/.test(m)
      )
      if (possibleId) {
        return __getRequire(possibleId, _mod)
      }
    }

    if (_mod.startsWith('node:') || nodeImports[_mod]) {
      console.warn(`Warning node import not supported: "${_mod}" from "${importer}"`)
      return {}
    }

    // find via maps
    let path = __specialRequireMap[_mod] || importsMap[_mod] || _mod
    const found = __getRequire(path, _mod)
    if (found) return found

    // quick and dirty relative()
    if (importer && path[0] === '.') {
      let currentDir = (() => {
        const paths = importer.split('/')
        return paths.slice(0, paths.length - 1) // remove last part to get dir
      })()

      const pathParts = path.split('/')
      while (true) {
        if (pathParts[0] !== '..') break
        pathParts.shift()
        currentDir.pop()
      }
      path = [...currentDir, ...pathParts]
        // Prevent generating a path like this: `foo/./bar.js` when requiring `./bar.js` from `foo`.
        .filter((p) => p !== '.')
        .join('/')
    }

    // find our import.meta.glob which don't get the nice path addition, for now hardcode but this shouldnt be hard to fix properly:
    const foundGlob = __getRequire(path.replace(/\.[jt]sx?$/, '.js'), _mod)
    if (foundGlob) {
      return foundGlob
    }

    // find internals loosely
    try {
      for (const [key, value] of Object.entries(__specialRequireMap)) {
        if (_mod.endsWith(value)) {
          const found = __getRequire(__specialRequireMap[key])
          if (found) {
            return found
          }
        }
      }
    } catch (err) {
      console.info('error loose internal', err)
    }

    // find externals loosely
    try {
      for (const [key, value] of Object.entries(importsMap)) {
        if (key.endsWith(_mod.replace(/(\.\.?\/)+/, ''))) {
          const found = __getRequire(importsMap[key], key)
          if (found) {
            return found
          }
        }
      }
    } catch (err) {
      console.info('error loose external', err)
    }

    // is this cruft
    if (globalThis[path]) {
      const output = globalThis[path]()
      __cachedModules[_mod] = output
      return output
    }

    if (_mod.endsWith('.css.js')) {
      // temp fix for hmr error logs
      return
    }

    console.error(
      `Module not found "${_mod}" imported by "${importer}"\n${getErrorDetails()}`
    )
    return {}
  } catch (err) {
    const errorMessage =
      `\n◆ ${_mod} "${err}"`.replace('Error: ', '').replaceAll('"', '') +
      '\n' +
      getErrorDetails(false)

    if (globalThis['no_console']) {
      // If we are in production, do not suppress error as it will be hard to debug (currently console.error in production is not shown or being logged anywhere).
      throw new Error(errorMessage)
    }

    console.error(errorMessage)
  }
}

globalThis['setImmediate'] = (cb) => cb()
//cb => Promise.resolve().then(() => cb())

globalThis.__vxrnReloadApp = () => {
  __getRequire(__specialRequireMap['react-native']).DevSettings.reload()
}

if (!globalThis['console']) {
  globalThis['console'] = {}
  globalThis['no_console'] = true // Probably running in production
}

// idk why
globalThis.__vxrnTmpLogs = []
;['trace', 'info', 'warn', 'error', 'log', 'group', 'groupCollapsed', 'debug'].forEach(
  (level) => {
    const og = globalThis['console'][level] || (() => {})
    globalThis['_ogConsole' + level] = og
    const ogConsole = og.bind(globalThis['console'])
    globalThis['console'][level] = (...data) => {
      if (globalThis.__vxrnTmpLogs) {
        globalThis.__vxrnTmpLogs.push({ level, data })
      }
      return ogConsole(...data)
    }
  }
)

console._isPolyfilled = true

global.performance = {
  now: () => Date.now(),
}

let _globalErrorHandler
global.ErrorUtils = {
  setGlobalHandler: (fun) => {
    _globalErrorHandler = fun
  },
  getGlobalHandler: () => (_globalErrorHandler || (() => {})),
  reportError: (error) => {
    _globalErrorHandler && _globalErrorHandler(error, false);
    console.log('e1', error.message, error.stack, Object.keys(error), JSON.stringify(error))
  },
  reportFatalError: (error) => {
    _globalErrorHandler && _globalErrorHandler(error, true);
    console.log('e2', error.message, error.stack, Object.keys(error), JSON.stringify(error))
  },
  // mocked
  applyWithGuard: () => {},
  applyWithGuardIfNeeded: () => {},
  inGuard: () => {},
  guard: () => {},
}

// These are necessary for react-native-reanimated to work. Without this, app will crash with `EXC_BAD_ACCESS` [here](https://github.com/software-mansion/react-native-reanimated/blob/3.10.1/Common/cpp/SharedItems/Shareables.cpp#L57) with `function.getProperty(rt, "name").getString(rt).utf8(rt).c_str()` being `assert`, `clear`, `dir`, `dirxml`, `profile`, `profileEnd`, `table`, etc.
// TODO: We may need to implement these functions in the future.
console.assert = () => {}
console.clear = () => {}
console.dir = () => {}
console.dirxml = () => {}
console.profile = () => {}
console.profileEnd = () => {}
console.table = () => {}

// ensure this exists
global.$RefreshReg$ = () => {}
global.$RefreshSig$ = () => (type) => type
