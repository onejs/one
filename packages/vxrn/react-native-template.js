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
// to avoid it looking like browser...
delete globalThis['window']

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

function printError(err) {
  return `${err instanceof Error ? `${err.message}\n${err.stack}` : err}`
}

const __runningModules = new Map()

function __getRequire(absPath, parent) {
  absPath =
    ___vxrnAbsoluteToRelative___[absPath] ||
    ___vxrnAbsoluteToRelative___[absPath.replace(/\.js$/, '.tsx')] ||
    ___vxrnAbsoluteToRelative___[absPath.replace(/\.js$/, '.ts')] ||
    ___vxrnAbsoluteToRelative___[absPath.replace(/\.js$/, '')] ||
    absPath

  if (!__cachedModules[absPath]) {
    const runModule = ___modules___[absPath]

    // do not run again if the module is already running, avoids stack overflow on circular dependencies
    if (__runningModules.has(absPath)) {
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
  'react-native': '.vxrn/react-native.js',
  react: '.vxrn/react.js',
  'react/jsx-runtime': '.vxrn/react-jsx-runtime.js',
  'react/jsx-dev-runtime': '.vxrn/react-jsx-runtime.js',
}

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

    // some sort of compat with new Rollup commonjs transform
    if (output && typeof output === 'object' && !('__require' in output)) {
      return new Proxy(output, {
        get(target, key) {
          if (key === '__require') {
            return () => output
          }
          return Reflect.get(target, key)
        },
      })
    }

    return output
  }
}

function getRequire(importer, importsMap, _mod) {
  const getErrorDetails = (withStack) => {
    return `In importsMap:

${JSON.stringify(importsMap, null, 2)}

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

    console.error(`Module not found "${_mod}" imported by "${importer}"\n${getErrorDetails()}`)
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
;['trace', 'info', 'warn', 'error', 'log', 'group', 'groupCollapsed', 'debug'].forEach((level) => {
  const og = globalThis['console'][level] || (() => {})
  globalThis['_ogConsole' + level] = og
  const ogConsole = og.bind(globalThis['console'])
  globalThis['console'][level] = (...data) => {
    if (globalThis.__vxrnTmpLogs) {
      globalThis.__vxrnTmpLogs.push({ level, data })
    }
    return ogConsole(...data)
  }
})

console._isPolyfilled = true

global.performance = {
  now: () => Date.now(),
}

global.ErrorUtils = {
  setGlobalHandler: () => {},
  reportFatalError: (err) => {
    // biome-ignore lint/suspicious/noConsoleLog: <explanation>
    console.log('err' + err['message'] + err['stack'])
  },
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
