import { vitePluginSsrCss } from './vite/vitePluginSsrCss'
import { clientTreeShakePlugin } from './vite/clientTreeShakePlugin'
import { type Options, createFileSystemRouter } from './vite/createFileSystemRouter'

export { createFileSystemRouter } from './vite/createFileSystemRouter'
export { setCurrentRequestHeaders } from './vite/headers'
export { clientTreeShakePlugin } from './vite/clientTreeShakePlugin'
export { vitePluginSsrCss } from './vite/vitePluginSsrCss'

export function getVitePlugins(options: Options) {
  return [
    createFileSystemRouter(options),
    clientTreeShakePlugin(),
    vitePluginSsrCss({
      entries: ['/src/entry-web'],
    }),
  ]
}
