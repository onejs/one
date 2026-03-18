export type RenderToStringOptions = {
    /**
     * Critical scripts that need to execute immediately (will use async).
     * These are added to bootstrapModules and generate both modulepreload links and async script tags.
     * Keep this list minimal (typically: setupClient, one-entry, page entry).
     */
    preloads?: string[];
    /**
     * Non-critical scripts that can wait (will only be modulepreload hints).
     * These only generate <link rel="modulepreload"> tags and are loaded when imported.
     * Use this for component libraries, utilities, and other non-essential modules.
     */
    deferredPreloads?: string[];
};
export declare const renderToString: (app: React.ReactElement, options: RenderToStringOptions) => Promise<string>;
/**
 * streaming SSR - returns a ReadableStream instead of a string.
 * skips allReady wait and post-processing. deferred preloads should
 * be in the React tree (React 19 hoists <link> to <head>).
 */
export declare const renderToStream: (app: React.ReactElement, options: RenderToStringOptions) => Promise<ReadableStream>;
//# sourceMappingURL=server-render.d.ts.map