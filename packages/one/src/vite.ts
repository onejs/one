// plugins
export { resolvePath } from '@vxrn/resolve'
export { clientTreeShakePlugin } from './vite/plugins/clientTreeShakePlugin'
export { removeReactNativeWebAnimatedPlugin } from './vite/plugins/removeReactNativeWebAnimatedPlugin'
export { SSRCSSPlugin } from './vite/plugins/SSRCSSPlugin'
export { createFileSystemRouterPlugin } from './vite/plugins/fileSystemRouterPlugin'

export { makePluginWebOnly } from './vite/makePluginWebOnly'

export { setResponseHeaders } from './vite/server'

export { build } from './cli/build'
export { one } from './vite/one'
