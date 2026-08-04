import './server/setupServerGlobals';
export { resolvePath } from '@vxrn/resolve';
export { withNativePlugin, type NativePluginContext, type NativePluginFactory, } from 'vxrn/vite-plugin';
export { build } from './cli/build';
export { makePluginWebOnly } from './vite/makePluginWebOnly';
export { one } from './vite/one';
export { clientTreeShakePlugin } from './vite/plugins/clientTreeShakePlugin';
export { createFileSystemRouterPlugin } from './vite/plugins/fileSystemRouterPlugin';
export { removeReactNativeWebAnimatedPlugin } from './vite/plugins/removeReactNativeWebAnimatedPlugin';
export { SSRCSSPlugin } from './vite/plugins/SSRCSSPlugin';
export { autoWarmPlugin } from './vite/plugins/warmRoutesPlugin';
//# sourceMappingURL=vite.d.ts.map