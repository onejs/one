// This needs to load before any other imports that might use the server globals.
// Specifically `one-server-only`, which will be imported at some level under
// some of the subsequent imports.
import './server/setupServerGlobals'

// plugins
export { resolvePath } from '@vxrn/resolve'
export { clientTreeShakePlugin } from './vite/plugins/clientTreeShakePlugin'
export { createFileSystemRouterPlugin } from './vite/plugins/fileSystemRouterPlugin'
export { removeReactNativeWebAnimatedPlugin } from './vite/plugins/removeReactNativeWebAnimatedPlugin'
export { SSRCSSPlugin } from './vite/plugins/SSRCSSPlugin'

export { makePluginWebOnly } from './vite/makePluginWebOnly'

export { build } from './cli/build'
export { one } from './vite/one'
