import type { Plugin } from 'vite';
import { type RozeniteHostOptions } from '../../devtools/rozeniteHost';
declare const DEVTOOLS_VIRTUAL_ID = "/@one/dev.js";
export type DevtoolsPluginOptions = {
    /** include devtools UI (overlay, inspector) - default true */
    includeUI?: boolean;
    /** browser plugin modules loaded into the overlay */
    plugins?: string[];
    /** Rozenite host options for React Native DevTools */
    rozenite?: RozeniteHostOptions | boolean;
    /** the Vite native bundler is serving iOS/Android from this server */
    native?: boolean;
};
export declare function createDevtoolsPlugin(options?: DevtoolsPluginOptions): Plugin;
export { DEVTOOLS_VIRTUAL_ID };
//# sourceMappingURL=devtoolsPlugin.d.ts.map