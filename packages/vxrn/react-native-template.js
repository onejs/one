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

globalThis['__cachedModules'] = {}

function __getRequire(absPath) {
  if (!__cachedModules[absPath]) {
    const runModule = ___modules___[absPath]
    if (runModule) {
      const mod = { exports: {} }
      try {
        runModule(mod.exports, mod)
      } catch (err) {
        console.error('Error running module: ' + mod + err)
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

function createRequire(importer, importsMap) {
  if (!importsMap) {
    console.error(`No imports map given from ${importer}\n${new Error().stack}`)
  }

  return function require(_mod) {
    try {
      let path = __specialRequireMap[_mod] || importsMap[_mod] || _mod
      const found = __getRequire(path)
      if (found) {
        return found
      }
      if (globalThis[path]) {
        const output = globalThis[path]()
        __cachedModules[_mod] = output
        return output
      }

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
        path = [...currentDir, ...pathParts].join('/')
      }

      // find our import.meta.glob which don't get the nice path addition, for now hardcode but this shouldnt be hard to fix properly:
      const foundGlob = __getRequire(path.replace('.tsx', '.js').replace('.ts', '.js'))
      if (foundGlob) {
        return foundGlob
      }

      console.error(
        `Module not found "${_mod}" imported by "${importer}"\n ${new Error().stack
          .split('\n')
          .map((l) => `    ${l}`)
          .join('\n')}`
      )
      return {}
    } catch (err) {
      throw new Error(`\n◆ ${_mod} "${err}"`.replace('Error: ', '').replaceAll('"', ''))
    }
  }
}

globalThis['setImmediate'] = (cb) => cb()
//cb => Promise.resolve().then(() => cb())

// idk why
console._tmpLogs = []
;['trace', 'info', 'warn', 'error', 'log', 'group', 'groupCollapsed', 'groupEnd', 'debug'].forEach(
  (level) => {
    const og = globalThis['console'][level]
    globalThis['_ogConsole' + level] = og
    const ogConsole = og.bind(globalThis['console'])
    globalThis['console'][level] = (...data) => {
      if (console._tmpLogs) {
        console._tmpLogs.push({ level, data })
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
