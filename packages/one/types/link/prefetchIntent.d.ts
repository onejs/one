/**
 * Intent-based link prefetching using mouse trajectory prediction.
 *
 * Uses ray-casting to detect when the user is moving toward a link,
 * scoring by distance + perpendicular offset. Winner-takes-all prevents
 * over-fetching when multiple links are in the path.
 *
 * Key features:
 * - Batched IntersectionObserver for efficient rect measurement (300ms intervals)
 * - Velocity smoothing to filter jitter
 * - Prefetched links removed from future checks
 * - Debounce between consecutive prefetches
 */
export type PrefetchIntentOptions = {
    onPrefetch: (href: string) => void;
    /** Max distance to consider (default: 600px) */
    maxReach?: number;
    /** Penalty multiplier for off-axis aim (default: 4) */
    perpWeight?: number;
    /** Min mouse speed to trigger (default: 6px/frame) */
    minSpeed?: number;
};
type RectEntry = {
    r: DOMRectReadOnly;
    h: string;
};
export declare function createPrefetchIntent(options: PrefetchIntentOptions): {
    setRects: (newRects: RectEntry[]) => void;
    move: (x: number, y: number, dx: number, dy: number) => void;
    observe: (el: HTMLElement, href: string) => () => void;
    nodes: Map<HTMLElement, string>;
    done: Set<string>;
};
export declare function startPrefetchIntent(onPrefetch: (href: string) => void): {
    setRects: (newRects: RectEntry[]) => void;
    move: (x: number, y: number, dx: number, dy: number) => void;
    observe: (el: HTMLElement, href: string) => () => void;
    nodes: Map<HTMLElement, string>;
    done: Set<string>;
};
export declare function observePrefetchIntent(el: HTMLElement, href: string): () => void;
export {};
//# sourceMappingURL=prefetchIntent.d.ts.map