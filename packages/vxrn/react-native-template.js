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
global['__DEV__'] = true
global['___modules___'] = {}
global['___vxrnAbsoluteToRelative___'] = {}
// to avoid it looking like browser...
delete globalThis['window']

// TODO fixing vite bringing along some preload-helper.js and this:
// var e = new Event("vite:preloadError", {
//   cancelable: true
// });
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

const __specialRequireMap = {
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
      if (_mod === 'vxs') {
        // TODO this should be passed in not hardcoded
        const found =
          __getRequire('packages/vxs/dist/esm/index.js', _mod) ||
          // this is only for developing links module in ~/vxrn, can remove later
          __getRequire('vxrn/packages/vxs/dist/esm/index.js', _mod)
        if (found) return found
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
      console.error(
        `\n◆ ${_mod} "${err}"`.replace('Error: ', '').replaceAll('"', '') +
          '\n' +
          getErrorDetails(false)
      )
    }
  }
}

globalThis['setImmediate'] = (cb) => cb()
//cb => Promise.resolve().then(() => cb())

globalThis.__vxrnReloadApp = () => {
  __getRequire(__specialRequireMap['react-native']).DevSettings.reload()
}

// idk why
globalThis.__vxrnTmpLogs = []
;['trace', 'info', 'warn', 'error', 'log', 'group', 'groupCollapsed', 'groupEnd', 'debug'].forEach(
  (level) => {
    const og = globalThis['console'][level]
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
