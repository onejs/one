export { createApp } from './createApp'

export type { One, OneRouter } from './interfaces/router'

/**
 * Image data returned by ?imagedata imports.
 * Install `sharp` to enable this feature: `npm install sharp`
 *
 * NOTE: This interface is also declared in types/env.d.ts for Vite module augmentation.
 * Keep both definitions in sync.
 */
export interface ImageData {
  /** URL path to the image */
  src: string
  /** Image width in pixels */
  width: number
  /** Image height in pixels */
  height: number
  /** Base64 blur placeholder (10px wide) */
  blurDataURL: string
}

import type { OneRouter } from './interfaces/router'

// if not overridden keep it as just string
export type Href = '__branded__' extends keyof OneRouter.Href ? string : OneRouter.Href

export type LinkProps<T extends string | object = string> = OneRouter.LinkProps<T>

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
export type RouteType<Path extends string = string> = OneRouter.RouteType<Path>

// hooks
export { useIsFocused } from '@react-navigation/core'
// re-export
export * from '@vxrn/color-scheme'
// TODO breaking due to react-native-gesture-handler
// export { Drawer } from './layouts/Drawer'
// export { Unmatched } from './fallbackViews/Unmatched'
export { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
export { onClientLoaderResolve } from './clientLoaderResolver'

// middleware
export { createMiddleware, type Middleware } from './createMiddleware'
// api routes
export {
  createAPIRoute,
  type APIRouteContext,
  type APIRouteHandler,
  type WorkerContext,
  type WorkerEnv,
  type WorkerExecutionContext,
} from './createAPIRoute'
export { getURL } from './getURL'
export { Head } from './head'
// for easier expo-router migration
export {
  useActiveParams,
  useGlobalSearchParams,
  useLocalSearchParams,
  useNavigationContainerRef,
  useParams,
  usePathname,
  useRootNavigationState,
  useRouter,
  useSearchParams,
  useSegments,
  useUnstableGlobalHref,
} from './hooks'
export { href } from './href'
export { getLinking, type OneLinkingConfig } from './link/getLinking'
export { useSitemap, type SitemapType } from './router/sitemap'
// components
export { Stack } from './layouts/Stack'
export { Tabs } from './layouts/Tabs'
export { Protected, type ProtectedProps } from './views/Protected'
// Stack header compositional API types
export type {
  StackHeaderBackButtonProps,
  StackHeaderLeftProps,
  StackHeaderProps,
  StackHeaderRightProps,
  StackHeaderSearchBarProps,
  StackHeaderTitleProps,
  StackScreenOptions,
  StackScreenProps,
} from './layouts/stack-utils'
// Stack render API (for custom web overlay rendering)
export type {
  StackRender,
  StackRenderComponent,
  StackRenderProps,
} from './router/web/ScreenRenderContext'
// Tabs / Drawer render API + global setup
export {
  getRenderingConfig,
  setupRendering,
  type DrawerRender,
  type DrawerRenderComponent,
  type DrawerRenderProps,
  type RenderingConfig,
  type TabsRender,
  type TabsRenderComponent,
  type TabsRenderProps,
} from './router/renderingRegistry'
// utilities
export { withLayoutContext } from './layouts/withLayoutContext'
export { Link } from './link/Link'
export { Redirect } from './link/Redirect'
export { useLinkTo } from './link/useLinkTo'
export { Root } from './Root'
// internals
export { render } from './render'
export { createRoute, route } from './router/createRoute'
// intercepting routes
export { closeIntercept, isInterceptedNavigation } from './router/interceptRoutes'
export { NamedSlot } from './views/Navigator'
// base
export { router } from './router/imperative-api'
export * as routerStore from './router/router'
export { useNavigation } from './router/useNavigation'
export { registerPreloadedRoute } from './router/useViteRoutes'
export type { Endpoint, LoaderProps } from './types'
// navigation blocking
export {
  useBlocker,
  type Blocker,
  type BlockerFunction,
  type BlockerState,
} from './useBlocker'
// route param validation
export {
  ParamValidationError,
  RouteValidationError,
  validateParams,
  zodParamValidator,
  type InferParamInput,
  type InferParamOutput,
  type ParamValidator,
  type RouteValidationFn,
  type ValidateRouteProps,
  type ValidationResult,
} from './validateParams'
// validation state hook
export { useValidationState, type ValidationState } from './router/router'
// React Navigation
export { useFocusEffect } from './useFocusEffect'
export {
  getLoaderTimingHistory,
  refetchLoader,
  useLoader,
  useLoaderState,
  type LoaderTimingEntry,
} from './useLoader'
export {
  setClientMatches,
  useMatch,
  useMatches,
  usePageMatch,
  type RouteMatch,
} from './useMatches'
export {
  useServerHeadInsertion,
  type ServerHeadInsertionCallback,
} from './useServerHeadInsertion'
export { isResponse } from './utils/isResponse'
export { redirect } from './utils/redirect'
export { removeParams } from './utils/removeParams'
export { watchFile } from './utils/watchFile'
// resilient dynamic-import recovery: retry a transient chunk-fetch failure in
// place (so it never poisons a React.lazy memo), then fall back to one's
// debounced reload. lazyWithRetry is a drop-in for React.lazy.
export { lazyWithRetry } from './lazyWithRetry'
export { handleSkewError, isChunkLoadError, loadWithRetry } from './utils/dynamicImport'
export { ErrorBoundary } from './views/ErrorBoundary'
export { LoadProgressBar } from './views/LoadProgressBar'
export { Navigator, Slot } from './views/Navigator'
export { ScrollBehavior } from './views/ScrollBehavior'
export { SourceInspector, type SourceInspectorProps } from './views/SourceInspector'
export type { ErrorBoundaryProps, ErrorRouteInfo } from './views/Try'
// scroll position groups
export { useScrollGroup } from './useScrollGroup'
// server
export { getServerData, setResponseHeaders, setServerData } from './vite/one-server-only'
