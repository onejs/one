import './polyfills'

import type { Plugin } from 'vite'
import { dirname, resolve } from 'node:path'
import { clientTreeShakePlugin } from './vite/clientTreeShakePlugin'
import { createFileSystemRouter, type Options } from './vite/createFileSystemRouter'
import { vitePluginSsrCss } from './vite/vitePluginSsrCss'
import { exists } from 'node:fs'

export { clientTreeShakePlugin } from './vite/clientTreeShakePlugin'
export { createFileSystemRouter } from './vite/createFileSystemRouter'
export { setCurrentRequestHeaders } from './vite/headers'
export { vitePluginSsrCss } from './vite/vitePluginSsrCss'

export { build } from './vite/build'
export { serve } from './vite/serve'

const existsAsync = (file: string) => {
  return new Promise((res, rej) => {
    try {
      exists(file, res)
    } catch {
      return false
    }
  })
}

export function getVitePlugins(options: Options) {
  return [
    {
      name: 'load-web-extensions',
      enforce: 'pre',
      async resolveId(id, importer = '') {
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
      },
    } as Plugin,

    createFileSystemRouter(options),
    clientTreeShakePlugin(),
    vitePluginSsrCss({
      entries: ['/src/entry-web'],
    }),
  ]
}
