import findNodeModules from 'find-node-modules'
import { join } from 'node:path'
import FSExtra from 'fs-extra'
import type { VXRNOptionsFilled } from './getOptionsFilled'
import { assertString } from './assert'

type Patch = {
  module: string
  patchFiles: {
    [key: string]: (contents?: string) => string | Promise<string>
  }
}

class Bail extends Error {}

function bailIfExists(haystack: string, needle: string) {
  if (haystack.includes(needle)) {
    throw new Bail()
  }
}

// TODO has no concept of version range checking, or patch versions

const patches: Patch[] = [
  {
    module: 'h3',
    patchFiles: {
      'dist/index.mjs': (contents) => {
        assertString(contents)
        bailIfExists(contents, '/** patch-version-1 **/')

        const insertPoint = contents.indexOf(`   return headers;`)
        return (
          contents.slice(0, insertPoint) +
          `
  /** patch-version-1 **/
  // The expoManifestRequestHandlerPlugin (Vite plugin) needs the original request host so that it can compose URLs that can be accessed by physical devices. This won't be needed once we retire h3 and use the Vite Dev Server directly.
  // This may not work if one installed vxrn from NPM since this patch may not apply.
  const originalHost = reqHeaders.host;
  if (originalHost) {
    headers['X-Forwarded-Host'] = originalHost;
  }

` +
          contents.slice(insertPoint)
        )
      },
    },
  },

  {
    module: 'react',
    patchFiles: {
      'index.web.js': () => {
        return `module.exports = require('@vxrn/vendor/react-19');`
      },
      'jsx-dev-runtime.web.js': () => {
        return `module.exports = require('@vxrn/vendor/react-jsx-dev-19');`
      },
      'jsx-runtime.web.js': () => {
        return `module.exports = require('@vxrn/vendor/react-jsx-19');`
      },
      'package.json': (contents) => {
        assertString(contents)
        bailIfExists(contents, 'index.web.js')

        const pkg = JSON.parse(contents)

        if (!pkg.exports['.']) {
          throw new Error(`Expected a version of React that has package.json exports defined`)
        }

        pkg.exports['.'] = {
          'react-server': './react.shared-subset.js',
          'react-native': './index.js',
          default: './index.web.js',
        }

        pkg.exports['./jsx-runtime'] = {
          'react-native': './jsx-runtime.js',
          default: './jsx-runtime.web.js',
        }

        pkg.exports['./jsx-dev-runtime'] = {
          'react-native': './jsx-dev-runtime.js',
          default: './jsx-dev-runtime.web.js',
        }

        return JSON.stringify(pkg, null, 2)
      },
    },
  },

  {
    module: 'react-dom',
    patchFiles: {
      'client.web.js': () => {
        return `module.exports = require('@vxrn/vendor/react-dom-client-19')`
      },

      'index.web.js': () => {
        return `module.exports = require('@vxrn/vendor/react-dom-19')`
      },

      'server.browser.web.js': () => {
        return `module.exports = require('@vxrn/vendor/react-dom-server.browser-19')`
      },

      'test-utils.web.js': () => {
        return `module.exports = require('@vxrn/vendor/react-dom-test-utils-19')`
      },

      'package.json': (contents) => {
        assertString(contents)
        bailIfExists(contents, 'index.web.js')

        const pkg = JSON.parse(contents)

        if (!pkg.exports['.']) {
          throw new Error(`Expected a version of React that has package.json exports defined`)
        }

        pkg.exports['.'] = {
          'react-native': './index.js',
          default: './index.web.js',
        }

        pkg.exports['./client'] = {
          'react-native': './client.js',
          default: './client.web.js',
        }

        pkg.exports['./server.browser'] = {
          'react-native': './server.browser.js',
          default: './server.browser.web.js',
        }

        pkg.exports['./test-utils'] = {
          'react-native': './test-utils.js',
          default: './test-utils.web.js',
        }

        return JSON.stringify(pkg, null, 2)
      },
    },
  },
]

export async function checkPatches(options: VXRNOptionsFilled) {
  if (options.state.applyPatches === false) {
    return
  }

  const nodeModulesDirs = findNodeModules({
    cwd: options.root,
  }).map((relativePath) => join(options.root, relativePath))

  await Promise.all(
    patches.flatMap((patch) => {
      return nodeModulesDirs.flatMap(async (dir) => {
        const nodeModuleDir = join(dir, patch.module)

        if (await FSExtra.pathExists(nodeModuleDir)) {
          for (const file in patch.patchFiles) {
            const log = () => {
              console.info(` Applying patch to ${patch.module}`)
            }

            try {
              const fullPath = join(nodeModuleDir, file)
              const patchFn = patch.patchFiles[file]

              // create
              if (!(await FSExtra.pathExists(fullPath))) {
                log()
                await FSExtra.writeFile(fullPath, await patchFn())
                return
              }

              // if its a create function (takes no arg), bail if it exists already
              if (patchFn.length === 0) {
                return
              }

              log()
              // update
              await FSExtra.writeFile(
                fullPath,
                await patchFn(await FSExtra.readFile(fullPath, 'utf-8'))
              )
            } catch (err) {
              if (err instanceof Bail) {
                return
              }
              throw err
            }
          }
        }
      })
    })
  )
}
