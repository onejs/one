export { createApp } from './createApp';
export type { One, OneRouter } from './interfaces/router';
import type { OneRouter } from './interfaces/router';
export type Href = '__branded__' extends keyof OneRouter.Href ? string : OneRouter.Href;
export type LinkProps<T extends string | object = string> = OneRouter.LinkProps<T>;
/**
 * Helper type to get route information including params and loader props.
 * Can be overridden in generated routes.d.ts for per-route types.
 *
 * @example
 * import type { RouteType } from 'one'
 *
 * type MyRoute = RouteType<'(site)/docs/[slug]'>
 * // MyRoute.Params = { slug: string }
 * // MyRoute.LoaderProps = { params: { slug: string }, path: string, request?: Request }
 */
export type RouteType<Path extends string = string> = OneRouter.RouteType<Path>;
export { useIsFocused } from '@react-navigation/core';
export * from '@vxrn/color-scheme';
export { SafeAreaView } from 'react-native-safe-area-context';
export { onClientLoaderResolve } from './clientLoaderResolver';
export { createMiddleware, type Middleware } from './createMiddleware';
export { getURL } from './getURL';
export { Head } from './head';
export { useActiveParams, useGlobalSearchParams, useLocalSearchParams, useNavigationContainerRef, useParams, usePathname, useRootNavigationState, useRouter, useSegments, useUnstableGlobalHref, } from './hooks';
export { href } from './href';
export { Stack } from './layouts/Stack';
export { Tabs } from './layouts/Tabs';
export { withLayoutContext } from './layouts/withLayoutContext';
export { Link } from './link/Link';
export { Redirect } from './link/Redirect';
export { useLinkTo } from './link/useLinkTo';
export { Root } from './Root';
export { render } from './render';
export { createRoute, route } from './router/createRoute';
export { router } from './router/imperative-api';
export * as routerStore from './router/router';
export { useNavigation } from './router/useNavigation';
export { registerPreloadedRoute } from './router/useViteRoutes';
export type { Endpoint, LoaderProps } from './types';
export { useFocusEffect } from './useFocusEffect';
export { useLoader, useLoaderState } from './useLoader';
export { type ServerHeadInsertionCallback, useServerHeadInsertion, } from './useServerHeadInsertion';
export { isResponse } from './utils/isResponse';
export { redirect } from './utils/redirect';
export { ErrorBoundary } from './views/ErrorBoundary';
export { LoadProgressBar } from './views/LoadProgressBar';
export { Navigator, Slot } from './views/Navigator';
export { ScrollBehavior } from './views/ScrollBehavior';
export { getServerData, setResponseHeaders, setServerData } from './vite/one-server-only';
//# sourceMappingURL=index.d.ts.map