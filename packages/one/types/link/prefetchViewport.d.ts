/**
 * Viewport-based link prefetching using IntersectionObserver.
 *
 * Prefetches links when they enter the viewport with 100px margin.
 * Lighter weight than intent-based, good for content-heavy pages.
 */
export type ViewportPrefetcher = ReturnType<typeof createPrefetchViewport>;
export declare function createPrefetchViewport(): {
    start: (prefetch: (href: string) => void) => void;
    observe: (el: HTMLElement, href: string) => () => void;
    done: Set<string>;
    nodes: Map<HTMLElement, string>;
};
export declare function startPrefetchViewport(prefetch: (href: string) => void): void;
export declare function observePrefetchViewport(el: HTMLElement, href: string): () => void;
//# sourceMappingURL=prefetchViewport.d.ts.map