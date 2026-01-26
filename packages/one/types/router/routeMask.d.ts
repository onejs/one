/**
 * Configuration for a route mask.
 * Route masking displays a different URL in the browser than the actual route being rendered.
 * Uses history.state to store the actual route, so on page reload the router can restore the original route.
 */
export interface RouteMaskOptions {
    /**
     * The route pattern to match (the actual route being navigated to).
     * Supports dynamic segments like [id] or $id.
     *
     * @example '/photos/[id]/modal' or '/photos/$photoId/modal'
     */
    from: string;
    /**
     * The route pattern to display in the browser URL (the masked URL).
     * Supports dynamic segments that will be populated from the matched params.
     *
     * @example '/photos/[id]' or '/photos/$photoId'
     */
    to: string;
    /**
     * How to handle parameters when masking.
     * - `true` (default): Forward all matched params to the masked URL
     * - `false`: Don't forward any params
     * - Function: Custom param transformation
     *
     * @default true
     */
    params?: boolean | ((matchedParams: Record<string, string>) => Record<string, string>);
    /**
     * If true, unmask when the page is reloaded (show the masked URL's content).
     * If false (default), keep the actual route on reload (show the original content).
     *
     * When false: Reload at /photos/5 → still shows /photos/5/modal content
     * When true: Reload at /photos/5 → shows /photos/5 content
     *
     * @default false
     */
    unmaskOnReload?: boolean;
    /**
     * If true, encode the actual route as a base64 postfix in the URL pathname instead of history.state.
     *
     * URL will look like: /photos/5__L3Bob3Rvcy81L21vZGFs
     *
     * Benefits:
     * - Server can parse the postfix and render the actual route (no SSR flash)
     * - URL contains the "truth" about what to render
     * - Works consistently across SSR, SSG, and SPA
     * - No query parameter visible
     *
     * Tradeoffs:
     * - URL has a base64 suffix visible after `__`
     *
     * @default false
     */
    useSearchParam?: boolean;
}
/**
 * A compiled route mask ready for matching.
 */
export interface RouteMask extends RouteMaskOptions {
    /** Regex pattern for matching the 'from' route */
    _fromRegex: RegExp;
    /** Parameter names extracted from the 'from' pattern */
    _fromParams: string[];
}
/**
 * Creates a route mask for automatic URL masking during navigation.
 *
 * Route masking displays a different URL in the browser than the actual route.
 * Uses browser history.state to store the actual route, enabling:
 * - Modal overlays with clean shareable URLs
 * - Different URL for in-app navigation vs direct access
 *
 * @example
 * ```tsx
 * import { createRouteMask } from 'one'
 *
 * const photoMask = createRouteMask({
 *   from: '/photos/[id]/modal',
 *   to: '/photos/[id]',
 *   params: true,
 * })
 *
 * // In vite.config.ts:
 * one({
 *   router: { routeMasks: [photoMask] },
 * })
 * ```
 */
export declare function createRouteMask(options: RouteMaskOptions): RouteMask;
/**
 * Matches a pathname against a route mask.
 * Returns the matched params if successful, or null if no match.
 */
export declare function matchRouteMask(pathname: string, mask: RouteMask): Record<string, string> | null;
/**
 * Builds the masked URL from a route mask and matched params.
 */
export declare function buildMaskedPath(mask: RouteMask, matchedParams: Record<string, string>): string;
/**
 * URL-safe base64 encode for the _unmask suffix.
 * Replaces +/= with URL-safe characters so the param looks like an opaque token.
 */
export declare function encodeUnmask(path: string): string;
/**
 * Decode a URL-safe base64 _unmask value back to the original path.
 */
export declare function decodeUnmask(encoded: string): string;
/**
 * Parse the base64-encoded unmask suffix from a pathname.
 * Looks for `__` separator in the last path segment.
 * Returns the decoded actual path, or null if no unmask suffix found.
 *
 * @example
 * parseUnmaskFromPath('/photos/3__L3Bob3Rvcy8zL21vZGFs') // '/photos/3/modal'
 * parseUnmaskFromPath('/photos/3') // null
 */
export declare function parseUnmaskFromPath(pathname: string): string | null;
/**
 * Finds a matching route mask for a given pathname.
 * Returns the mask result to apply, or undefined if no match.
 */
export declare function findMatchingMask(pathname: string, routeMasks: RouteMask[]): {
    maskedPath: string;
    unmaskOnReload: boolean;
    useSearchParam: boolean;
    actualPath: string;
} | undefined;
//# sourceMappingURL=routeMask.d.ts.map