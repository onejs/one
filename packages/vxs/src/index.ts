import './polyfills'
import type { VXSRouter } from './interfaces/router'

export type { Endpoint } from './types'

export * from '@vxrn/universal-color-scheme'

export type Href = VXSRouter.Href
export type LinkProps = VXSRouter.LinkProps

export { Root } from './Root'
export { render } from './render'

export { Stack } from './layouts/Stack'
export { Tabs } from './layouts/Tabs'

// TODO breaking due to react-native-gesture-handler
// export { Drawer } from './layouts/Drawer'

export { SafeAreaView } from 'react-native-safe-area-context'
export { Navigator, Slot } from './views/Navigator'
export { ErrorBoundary } from './views/ErrorBoundary'
export { Unmatched } from './views/Unmatched'
export { ScrollRestoration } from './views/ScrollRestoration'
export { PageLoadProgressBar } from './views/PageLoadProgressBar'

export { createApp } from './createApp'

export { isResponse } from './utils/isResponse'
export { useIsomorphicLayoutEffect } from './utils/useIsomorphicLayoutEffect'

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

export * as routerStore from './router/router'

export { router } from './imperative-api'

export { Link } from './link/Link'
export { Redirect } from './link/Redirect'

export { Head } from './head'

export { withLayoutContext } from './layouts/withLayoutContext'

// React Navigation
export { useFocusEffect } from './useFocusEffect'
export { useNavigation } from './useNavigation'

export { type LoaderProps, useLoader } from './useLoader'
