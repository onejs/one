import type { PluginOption } from 'vite'
import { dirname, resolve } from 'node:path'
import { clientTreeShakePlugin } from './clientTreeShakePlugin'
import { createFileSystemRouter, type Options } from './createFileSystemRouter'
import { vitePluginSsrCss } from './vitePluginSsrCss'
import { existsAsync } from '../utils/existsAsync'

export function vxs(options: Options): PluginOption {
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
    },

    createFileSystemRouter(options),
    clientTreeShakePlugin(),
    vitePluginSsrCss({
      entries: ['/src/entry-web'],
    }),
  ]
}
