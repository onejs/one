export type RenderToStringOptions = {
    /**
     * Critical scripts that need to execute immediately (will use async).
     * These are added to bootstrapModules and generate both modulepreload links and async script tags.
     */
    preloads?: string[];
};
/**
 * Buffered SSR - renders to full HTML string.
 * Deferred preloads and server data are rendered in the React tree
 * (React 19 hoists <link> to <head>).
 */
export declare const renderToString: (app: React.ReactElement, options: RenderToStringOptions) => Promise<string>;
/**
 * Streaming SSR - returns ReadableStream directly.
 * Skips allReady wait for faster TTFB.
 */
export declare const renderToStream: (app: React.ReactElement, options: RenderToStringOptions) => Promise<ReadableStream>;
//# sourceMappingURL=server-render.d.ts.map