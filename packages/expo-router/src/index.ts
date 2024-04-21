import './polyfills'

export { Root } from './Root'
export { renderToString } from './render'

export { Stack } from './layouts/Stack'
export { Tabs } from './layouts/Tabs'
import { Navigator, Slot } from './views/Navigator'

export {
  useRouter,
  useUnstableGlobalHref,
  usePathname,
  useNavigationContainerRef,
  useGlobalSearchParams,
  useLocalSearchParams,
  useSegments,
  useRootNavigation,
  useRootNavigationState,
} from './hooks'

export { store as routerStore } from './global-state/router-store'

export { router } from './imperative-api'

export { Link, Redirect } from './link/Link'

export { Head } from './head'

export { withLayoutContext } from './layouts/withLayoutContext'
export { Navigator, Slot }

// Expo Router Views
export { ErrorBoundary } from './views/ErrorBoundary'
export { Unmatched } from './views/Unmatched'

// Platform
export { SplashScreen } from './views/Splash'

// React Navigation
export { useFocusEffect } from './useFocusEffect'
export { useNavigation } from './useNavigation'
