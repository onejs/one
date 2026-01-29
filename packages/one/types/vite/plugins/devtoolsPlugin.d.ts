import type { Plugin } from 'vite';
declare const DEVTOOLS_VIRTUAL_ID = "/@one/dev.js";
export type DevtoolsPluginOptions = {
    /** include devtools UI (overlay, inspector) - default true */
    includeUI?: boolean;
};
export declare function createDevtoolsPlugin(options?: DevtoolsPluginOptions): Plugin;
export { DEVTOOLS_VIRTUAL_ID };
//# sourceMappingURL=devtoolsPlugin.d.ts.map