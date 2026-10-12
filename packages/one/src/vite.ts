// This needs to load before any other imports that might use the server globals.
// Specifically `one-server-only`, which will be imported at some level under
// some of the subsequent imports.
import './server/setupServerGlobals'

// plugins
export { resolvePath } from '@vxrn/resolve'
export { build } from './cli/build'
export { makePluginWebOnly } from './vite/makePluginWebOnly'
export { one } from './vite/one'
// evaluates the vite config in cwd and returns its one() options, native.app included
export { loadUserOneOptions } from './vite/loadConfig'
export { clientTreeShakePlugin } from './vite/plugins/clientTreeShakePlugin'
export { createFileSystemRouterPlugin } from './vite/plugins/fileSystemRouterPlugin'
export { removeReactNativeWebAnimatedPlugin } from './vite/plugins/removeReactNativeWebAnimatedPlugin'
export { SSRCSSPlugin } from './vite/plugins/SSRCSSPlugin'
export { autoWarmPlugin } from './vite/plugins/warmRoutesPlugin'
