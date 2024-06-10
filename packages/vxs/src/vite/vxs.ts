import { dirname, resolve } from 'node:path'
import type { PluginOption } from 'vite'
import { getOptimizeDeps } from 'vxrn'
import { existsAsync } from '../utils/existsAsync'
import { clientTreeShakePlugin } from './clientTreeShakePlugin'
import { createFileSystemRouter, type Options } from './createFileSystemRouter'
import { createVirtualEntry, virtualEntryId } from './virtualEntryPlugin'
import { vitePluginSsrCss } from './vitePluginSsrCss'
import { version } from 'react'

export function vxs(options_: Omit<Options, 'root'> = {}): PluginOption {
  if (!version.startsWith('19.')) {
    console.error(`Must be on React 19, instead found`, version)
    process.exit(1)
  }

  // hardcoding app
  const options = {
    ...options_,
    root: 'app',
  }

  // build is superset for now
  const { optimizeDeps } = getOptimizeDeps('build')
  const optimizeIds = optimizeDeps.include
  const optimizeIdRegex = new RegExp(
    // santize ids for regex
    // https://stackoverflow.com/questions/6300183/sanitize-string-of-regex-characters-before-regexp-build
    `${optimizeIds.map((id) => id.replace(/[#-.]|[[-^]|[?|{}]/g, '\\$&')).join('|')}`
  )

  return [
    // not working to watch various things...
    // {
    //   name: 'watch-node-modules',
    //   configureServer(server) {
    //     const { watcher, moduleGraph } = server

    //     // Watch the specified include patterns using Vite's internal watcher
    //     const customWatcher = chokidar.watch(['node_modules/**/*.js'], {
    //       cwd: join(process.cwd(), '..', '..'),
    //       ignoreInitial: true,
    //     })

    //     customWatcher.on('all', (event, path) => {
    //       console.log('gotem', path)
    //       moduleGraph.invalidateAll()
    //     })

    //     watcher.on('close', () => customWatcher.close())
    //   },
    // },

    createVirtualEntry(options),

    {
      name: 'load-web-extensions',
      enforce: 'pre',
      async resolveId(id, importer = '') {
        const shouldOptimize = optimizeIdRegex.test(importer)

        if (shouldOptimize) {
          const absolutePath = resolve(dirname(importer), id)
          const webPath = absolutePath.replace(/(.m?js)/, '') + '.web.js'
          if (webPath === id) return
          try {
            const directoryPath = absolutePath + '/index.web.js'
            if (await existsAsync(directoryPath)) {
              return directoryPath
            }
            if (await existsAsync(webPath)) {
              return webPath
            }
          } catch (err) {
            console.warn(`error probably fine`, err)
          }
        }
      },
    },

    createFileSystemRouter(options),
    clientTreeShakePlugin(),
    vitePluginSsrCss({
      entries: [virtualEntryId],
    }),
  ]
}
