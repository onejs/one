import type { One } from './vite/types';
export declare const isWebClient: boolean;
export declare const isWebServer: boolean;
export declare const isNative: boolean;
export declare const CACHE_KEY: string;
export declare const LOADER_JS_POSTFIX_UNCACHED = "_vxrn_loader.js";
export declare const LOADER_JS_POSTFIX_REGEX_STRING = "_\\d+_vxrn_loader.js$";
export declare const LOADER_JS_POSTFIX_REGEX: RegExp;
export declare const LOADER_JS_POSTFIX: string;
export declare const PRELOAD_JS_POSTFIX: string;
export declare const CSS_PRELOAD_JS_POSTFIX: string;
export declare const VIRTUAL_SSR_CSS_ENTRY = "virtual:ssr-css.css";
export declare const VIRTUAL_SSR_CSS_HREF = "/@id/__x00__virtual:ssr-css.css";
export declare const SERVER_CONTEXT_KEY = "__one_server_context__";
export declare const getSpaHeaderElements: ({ serverContext, }?: {
    serverContext?: One.ServerContext;
}) => string;
//# sourceMappingURL=constants.d.ts.map