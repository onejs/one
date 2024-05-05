import type { Plugin } from 'vite'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { clientTreeShakePlugin } from './vite/clientTreeShakePlugin'
import { createFileSystemRouter, type Options } from './vite/createFileSystemRouter'
import { vitePluginSsrCss } from './vite/vitePluginSsrCss'

export { clientTreeShakePlugin } from './vite/clientTreeShakePlugin'
export { createFileSystemRouter } from './vite/createFileSystemRouter'
export { setCurrentRequestHeaders } from './vite/headers'
export { vitePluginSsrCss } from './vite/vitePluginSsrCss'

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
          if (existsSync(directoryPath)) {
            console.info(`temp fix found ${directoryPath}`)
            return directoryPath
          }
          if (existsSync(webPath)) {
            console.info(`temp fix found ${webPath}`)
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
