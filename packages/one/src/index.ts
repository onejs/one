export { createApp } from './createApp'

export type { One, OneRouter } from './interfaces/router'

import type { OneRouter } from './interfaces/router'

// if not overridden keep it as just string
export type Href = OneRouter.Href extends string ? OneRouter.Href : string

export type LinkProps<T extends string | object = string> = OneRouter.LinkProps<T>

// hooks
export { useIsFocused } from '@react-navigation/core'
// re-export
export * from '@vxrn/universal-color-scheme'
// TODO breaking due to react-native-gesture-handler
// export { Drawer } from './layouts/Drawer'
// export { Unmatched } from './fallbackViews/Unmatched'
export { SafeAreaView } from 'react-native-safe-area-context'
export { onClientLoaderResolve } from './clientLoaderResolver'

// middleware
export { createMiddleware, type Middleware } from './createMiddleware'
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
  useSegments,
  useUnstableGlobalHref,
} from './hooks'
export { href } from './href'
// components
export { Stack } from './layouts/Stack'
export { Tabs } from './layouts/Tabs'
// utilities
export { withLayoutContext } from './layouts/withLayoutContext'
export { Link } from './link/Link'
export { Redirect } from './link/Redirect'
export { useLinkTo } from './link/useLinkTo'
export { Root } from './Root'
// internals
export { render } from './render'
export { createRoute, route } from './router/createRoute'
// base
export { router } from './router/imperative-api'
export * as routerStore from './router/router'
export { useNavigation } from './router/useNavigation'
export type { Endpoint, LoaderProps } from './types'
// React Navigation
export { useFocusEffect } from './useFocusEffect'
export { useLoader } from './useLoader'
export { type ServerHeadInsertionCallback, useServerHeadInsertion } from './useServerHeadInsertion'
export { isResponse } from './utils/isResponse'
export { redirect } from './utils/redirect'
export { ErrorBoundary } from './views/ErrorBoundary'
export { LoadProgressBar } from './views/LoadProgressBar'
export { Navigator, Slot } from './views/Navigator'
export { ScrollBehavior } from './views/ScrollBehavior'
// server
export { getServerData, setResponseHeaders, setServerData } from './vite/one-server-only'
