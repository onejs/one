import type { PluginObj } from '@babel/core';
type PluginOptions = {
    env?: Record<string, string | undefined>;
};
export declare const importMetaEnvPlugin: (api: object, options: PluginOptions | null | undefined, dirname: string) => PluginObj<import("@babel/core").PluginPass>;
export default importMetaEnvPlugin;
//# sourceMappingURL=import-meta-env-plugin.d.ts.map