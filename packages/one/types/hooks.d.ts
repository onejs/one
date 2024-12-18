import { type ReactNode } from 'react';
import type { OneRouter } from './interfaces/router';
type SearchParams = OneRouter.SearchParams;
export declare function useRootNavigationState(): any;
export declare function useRouteInfo(): import("./router/getNormalizedStatePath").UrlObject;
/** @return the root `<NavigationContainer />` ref for the app. The `ref.current` may be `null` if the `<NavigationContainer />` hasn't mounted yet. */
export declare function useNavigationContainerRef(): OneRouter.NavigationRef;
export declare function Frozen({ on, children }: {
    on?: boolean;
    children: ReactNode;
}): any;
export declare function useRouter(): OneRouter.Router;
/**
 * @private
 * @returns the current global pathname with query params attached. This may change in the future to include the hostname from a predefined universal link, i.e. `/foobar?hey=world` becomes `https://acme.dev/foobar?hey=world`
 */
export declare function useUnstableGlobalHref(): string;
/**
 * Get a list of selected file segments for the currently selected route. Segments are not normalized, so they will be the same as the file path. e.g. /[id]?id=normal -> ["[id]"]
 *
 * `useSegments` can be typed using an abstract.
 * Consider the following file structure, and strictly typed `useSegments` function:
 *
 * ```md
 * - app
 *   - [user]
 *     - index.js
 *     - followers.js
 *   - settings.js
 * ```
 * This can be strictly typed using the following abstract:
 *
 * ```ts
 * const [first, second] = useSegments<['settings'] | ['[user]'] | ['[user]', 'followers']>()
 * ```
 */
export declare function useSegments<TSegments extends string[] = string[]>(): TSegments;
/** @returns global selected pathname without query parameters. */
export declare function usePathname(): string;
/**
 * Get the globally selected query parameters, including dynamic path segments. This function will update even when the route is not focused.
 * Useful for analytics or other background operations that don't draw to the screen.
 *
 * When querying search params in a stack, opt-towards using `useParams` as these will only
 * update when the route is focused.
 *
 * @see `useParams`
 */
export declare function useActiveParams<TParams extends Object = SearchParams>(): Partial<TParams>;
/** @deprecated @see `useParams` */
export declare const useLocalSearchParams: typeof useParams;
/** @deprecated @see `useActiveParams` */
export declare const useGlobalSearchParams: typeof useActiveParams;
/**
 * Returns the URL search parameters for the contextually focused route. e.g. `/acme?foo=bar` -> `{ foo: "bar" }`.
 * This is useful for stacks where you may push a new screen that changes the query parameters.
 *
 * To observe updates even when the invoking route is not focused, use `useActiveParams()`.
 */
export declare function useParams<TParams extends Object = SearchParams>(): Partial<TParams>;
export {};
//# sourceMappingURL=hooks.d.ts.map