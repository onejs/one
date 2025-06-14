import { setServerGlobals } from './server/setServerGlobals'

// plugins
setServerGlobals()
console.log('ok, vite, setServerGlobals')
console.log(process.env)
export { resolvePath } from '@vxrn/resolve'
export { one } from './vite/one'
export { clientTreeShakePlugin } from './vite/plugins/clientTreeShakePlugin'
export { createFileSystemRouterPlugin } from './vite/plugins/fileSystemRouterPlugin'
export { removeReactNativeWebAnimatedPlugin } from './vite/plugins/removeReactNativeWebAnimatedPlugin'
export { SSRCSSPlugin } from './vite/plugins/SSRCSSPlugin'

export { makePluginWebOnly } from './vite/makePluginWebOnly'

export { build } from './cli/build'
