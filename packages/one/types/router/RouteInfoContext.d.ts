import type React from 'react';
import type { UrlObject } from './getNormalizedStatePath';
export declare const RouteInfoContext: React.Context<UrlObject | undefined>;
/**
 * Provides the route info (a `UrlObject`) through a context for child page.
 * Such context can be used to implement hooks such as `usePathname`.
 *
 * **IMPORTANT**: The current implementation uses `useStateForPath` - which will not return the a complete state if it isn't being called from a component under a leaf route node.
 * In other words, the provided route info may not be correct when used in a `_layout`. For example, if the user is on a page `/blog/123`:
 *
 * ```
 * app
 * ├── _layout.tsx
 * ├── index.tsx
 * └── blog
 *     ├── _layout.tsx - in BlogLayout, pathname will be "/blog"
 *     └── [id].tsx - in BlogPage, pathname will be "/blog/123"
 * ```
 *
 * The returned value is lazily calculated and cached, so we won't waste CPU cycles to calculate it if no one is asking for it.
 *
 * This is implemented with the `useStateForPath` hook provided by React Navigation, which is known to be safe for not returning a stale or incomplete state when used in pages. See: https://github.com/react-navigation/react-navigation/pull/12521
 */
export declare function RouteInfoContextProvider({ children }: {
    children: React.ReactNode;
}): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=RouteInfoContext.d.ts.map