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
//# sourceMappingURL=server-render.d.ts.map