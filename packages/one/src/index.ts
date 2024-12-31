export { createApp } from './createApp'

export type { OneRouter, One } from './interfaces/router'
import type { OneRouter } from './interfaces/router'

export type Href = OneRouter.Href
export type LinkProps<T extends string | object = string> = OneRouter.LinkProps<T>

export type { Endpoint, LoaderProps } from './types'

// base
export { router } from './imperative-api'
export { createRoute, route } from './createRoute'
export { onClientLoaderResolve } from './clientLoaderResolver'

// middleware
export { createMiddleware, type Middleware } from './createMiddleware'

// internals
export { render } from './render'
export { Root } from './Root'
export * as routerStore from './router/router'

// components
export { Stack } from './layouts/Stack'
export { Tabs } from './layouts/Tabs'
// TODO breaking due to react-native-gesture-handler
// export { Drawer } from './layouts/Drawer'
// export { Unmatched } from './fallbackViews/Unmatched'
export { SafeAreaView } from 'react-native-safe-area-context'
export { Navigator, Slot } from './views/Navigator'
export { ErrorBoundary } from './views/ErrorBoundary'
export { ScrollRestoration } from './views/ScrollRestoration'
export { LoadProgressBar } from './views/LoadProgressBar'
export { Link } from './link/Link'
export { Redirect } from './link/Redirect'
export { Head } from './head'

// hooks
export { useLinkTo } from './link/useLinkTo'
export {
  useRouter,
  useUnstableGlobalHref,
  usePathname,
  useNavigationContainerRef,
  useParams,
  useActiveParams,
  useSegments,
  useRootNavigationState,
} from './hooks'
// for easier expo-router migration
export {
  useLocalSearchParams,
  useGlobalSearchParams,
} from './hooks'

// utilities
export { withLayoutContext } from './layouts/withLayoutContext'
export { isResponse } from './utils/isResponse'
export { getURL } from './getURL'
export { redirect } from './utils/redirect'
export { href } from './href'

// re-export
export * from '@vxrn/universal-color-scheme'

// React Navigation
export { useFocusEffect } from './useFocusEffect'
export { useNavigation } from './useNavigation'
export { useLoader } from './useLoader'
