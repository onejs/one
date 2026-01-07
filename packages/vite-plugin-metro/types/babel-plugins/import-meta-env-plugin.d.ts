import type { PluginObj } from '@babel/core'
type PluginOptions = {
  env?: Record<string, string | undefined>
}
/**
 * A Babel plugin to replace `import.meta.env` and `import.meta.env.*` with the provided env variables.
 *
 * This plugin may not be referenced directly since metro runs transformers in separate workers, search for `@vxrn/vite-plugin-metro/babel-plugins/import-meta-env-plugin` to see how it's used.
 */
export declare const importMetaEnvPlugin: (
  api: object,
  options: PluginOptions | null | undefined,
  dirname: string
) => PluginObj<import('@babel/core').PluginPass>
export default importMetaEnvPlugin
//# sourceMappingURL=import-meta-env-plugin.d.ts.map
