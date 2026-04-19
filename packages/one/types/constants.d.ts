import type { One } from './vite/types';
export declare const isWebClient: boolean;
export declare const isWebServer: boolean;
export declare const isNative: boolean;
/**
 * True only in a browser main-thread context with a navigable history —
 * i.e. `window` AND `window.history` are available. Excludes native,
 * SSR, web workers / service workers (no `window`), and exotic sandboxed
 * environments where `window` exists but history is stripped. Use this
 * for guarding any `window.history` / `window.location` access so
 * intercept routes, URL masking, etc. don't assume a full browser.
 */
export declare const hasWebHistory: boolean;
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