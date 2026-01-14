import React, { type ReactNode } from 'react';
import type { OneRouter } from './interfaces/router';
type SearchParams = OneRouter.SearchParams;
/**
 * Returns the root navigation state from the NavigationContainer.
 *
 * @returns The root navigation state object
 * @link https://onestack.dev/docs/api/hooks/useRootNavigationState
 */
export declare function useRootNavigationState(): OneRouter.ResultState;
/**
 * Returns the current route information including pathname, params, and segments.
 * Automatically handles layout vs page context for accurate route info.
 *
 * @returns Route info object with pathname, params, segments, and more
 * @link https://onestack.dev/docs/api/hooks/useRouteInfo
 */
export declare function useRouteInfo(): import("./router/getNormalizedStatePath").UrlObject;
/** @return the root `<NavigationContainer />` ref for the app. The `ref.current` may be `null` if the `<NavigationContainer />` hasn't mounted yet. */
export declare function useNavigationContainerRef(): OneRouter.NavigationRef;
export declare function Frozen({ on, children }: {
    on?: boolean;
    children: ReactNode;
}): string | number | bigint | boolean | Iterable<React.ReactNode> | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | import("react/jsx-runtime").JSX.Element | null | undefined;
/**
 * Returns the imperative router API for programmatic navigation.
 *
 * @returns Router object with navigate, push, replace, back, and more
 * @link https://onestack.dev/docs/api/hooks/useRouter
 *
 * @example
 * ```tsx
 * const router = useRouter()
 * router.push('/settings')
 * router.back()
 * ```
 */
export declare function useRouter(): OneRouter.Router;
/**
 * @private
 * @returns the current global pathname with query params attached. This may change in the future to include the hostname from a predefined universal link, i.e. `/foobar?hey=world` becomes `https://acme.dev/foobar?hey=world`
 */
export declare function useUnstableGlobalHref(): string;
/**
 * Returns route segments as an array matching the file path structure.
 * Segments are not resolved, so dynamic segments appear as `[id]` not their values.
 *
 * @returns Array of path segments
 * @link https://onestack.dev/docs/api/hooks/useSegments
 *
 * @example
 * ```tsx
 * // File: app/users/[id]/settings.tsx
 * // URL: /users/123/settings
 * const segments = useSegments()
 * // Returns: ['users', '[id]', 'settings']
 * ```
 *
 * @example Typed segments
 * ```ts
 * type AppSegments = ['settings'] | ['[user]'] | ['[user]', 'followers']
 * const [first, second] = useSegments<AppSegments>()
 * ```
 */
export declare function useSegments<TSegments extends string[] = string[]>(): TSegments;
/**
 * Returns the current pathname without query parameters or hash.
 *
 * @returns The pathname string (e.g., '/users/123')
 * @link https://onestack.dev/docs/api/hooks/usePathname
 *
 * @example
 * ```tsx
 * // URL: /users/123?tab=settings#section
 * const pathname = usePathname()
 * // Returns: '/users/123'
 * ```
 */
export declare function usePathname(): string;
/**
 * Returns URL parameters globally, updating even when the route is not focused.
 * Useful for analytics, background sync, or global UI like breadcrumbs.
 *
 * For most component use cases, prefer `useParams` which only updates when focused.
 *
 * @returns Object containing URL parameters
 * @link https://onestack.dev/docs/api/hooks/useActiveParams
 * @see useParams for focus-aware params
 */
export declare function useActiveParams<TParams extends object = SearchParams>(): Partial<TParams>;
/** @deprecated @see `useParams` */
export declare const useLocalSearchParams: typeof useParams;
/** @deprecated @see `useActiveParams` */
export declare const useGlobalSearchParams: typeof useActiveParams;
/**
 * Returns URL parameters for the focused route, including dynamic segments and query params.
 * Only updates when this route is focused - ideal for stack navigators.
 *
 * @returns Object containing URL parameters (values are URL-decoded)
 * @link https://onestack.dev/docs/api/hooks/useParams
 * @see useActiveParams for global params that update even when unfocused
 *
 * @example
 * ```tsx
 * // Route: /users/[id].tsx
 * // URL: /users/123?tab=settings
 * const { id, tab } = useParams<{ id: string; tab?: string }>()
 * // id = '123', tab = 'settings'
 * ```
 */
export declare function useParams<TParams extends object = SearchParams>(): Partial<TParams>;
export {};
//# sourceMappingURL=hooks.d.ts.map