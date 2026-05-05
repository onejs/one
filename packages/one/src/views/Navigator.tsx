// Copyright © 2024 650 Industries.
import {
  type RouterFactory,
  StackRouter,
  useNavigationBuilder,
} from '@react-navigation/native'
import { NavigationRouteContext } from '@react-navigation/core'
import * as React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFilterScreenChildren } from '../layouts/withLayoutContext'
import {
  findNearestNotFoundRoute,
  findRouteNodeByPath,
  useNotFoundState,
} from '../notFoundState'
import { useContextKey } from '../router/Route'
import { getResolvedLinking } from '../router/linkingConfig'
import { routeNode as globalRouteNode, initialPathname } from '../router/router'
import { registerProtectedRoutes, unregisterProtectedRoutes } from '../router/router'
import { useSortedScreens, getQualifiedRouteComponent } from '../router/useScreens'
import { Screen } from './Screen'

// Static key used to prevent React from unmounting/remounting Slot content
// when route keys change during navigation. Since Slot only renders one screen
// at a time anyway, we can safely reuse the same component instance.
const SLOT_STATIC_KEY = 'one-slot-static-key'

// resolve a navigator's initialRouteName by asking the linking config —
// the same getStateFromPath NavigationContainer uses for initialState —
// and walking the resulting nested state down to this navigator's depth.
//
// the contextKey of a layout (e.g. `/(public)/(auth-flow)`) lines up
// segment-for-segment with the route names react-navigation uses in its
// state tree, so this is a lookup at the right depth, not a re-derivation.
//
// hoisting wrinkle: when a directory has no `_layout.tsx`, its children
// are flattened into the nearest parent navigator with a multi-segment
// route name like `dashboard/[appId]/index`. the walker accepts these by
// consuming as many contextKey segments as the route's name spans.
function resolveInitialRouteFromLinking(
  contextKey: string,
  browserPath: string
): string | undefined {
  const linking = getResolvedLinking()
  if (!linking?.getStateFromPath) return undefined

  let current = linking.getStateFromPath(browserPath, linking.config)
  const segments = contextKey.split('/').filter(Boolean)

  let i = 0
  while (i < segments.length) {
    if (!current?.routes?.length) return undefined
    const idx = current.index ?? current.routes.length - 1
    const focused = current.routes[idx]
    if (!focused?.name || !focused.state) return undefined
    const nameSegments = focused.name.split('/').filter(Boolean)
    const expected = segments.slice(i, i + nameSegments.length).join('/')
    if (focused.name !== expected) return undefined
    current = focused.state
    i += nameSegments.length
  }

  if (!current?.routes?.length) return undefined
  const idx = current.index ?? current.routes.length - 1
  return current.routes[idx]?.name
}

type NavigatorTypes = ReturnType<typeof useNavigationBuilder>

// Import RouteNode type for slot state
import type { RouteNode } from '../router/Route'
import { registerClearSlotStates, registerSetSlotState } from '../router/interceptRoutes'

// Slot state for parallel routes / intercepting routes
export interface SlotState {
  /** The route key currently being rendered in this slot (null = show default) */
  activeRouteKey: string | null
  /** The actual RouteNode to render (needed because slot routes aren't in navigator) */
  activeRouteNode?: RouteNode
  /** Params extracted from the matched path */
  params?: Record<string, string>
  /** Whether this is from an interception (soft nav) or direct nav */
  isIntercepted: boolean
}

// Global slot state storage - shared across navigators
const globalSlotState = new Map<string, SlotState>()
const slotStateListeners = new Set<() => void>()

export function getSlotState(slotName: string): SlotState | undefined {
  return globalSlotState.get(slotName)
}

export function setSlotState(slotName: string, state: SlotState | null) {
  if (state === null) {
    globalSlotState.delete(slotName)
  } else {
    globalSlotState.set(slotName, state)
  }
  // Notify listeners
  slotStateListeners.forEach((listener) => listener())
}

export function clearAllSlotStates() {
  globalSlotState.clear()
  slotStateListeners.forEach((listener) => listener())
}

// Register callbacks with interceptRoutes to avoid circular deps
registerClearSlotStates(clearAllSlotStates)
registerSetSlotState(setSlotState)

function useSlotStateSubscription() {
  const [, forceUpdate] = React.useReducer((x) => x + 1, 0)

  React.useEffect(() => {
    slotStateListeners.add(forceUpdate)
    return () => {
      slotStateListeners.delete(forceUpdate)
    }
  }, [])
}

// TODO: This might already exist upstream, maybe something like `useCurrentRender` ?
export const NavigatorContext = React.createContext<{
  contextKey: string
  state: NavigatorTypes['state']
  navigation: NavigatorTypes['navigation']
  descriptorsRef: React.MutableRefObject<NavigatorTypes['descriptors']>
  router: RouterFactory<any, any, any>
} | null>(null)

if (process.env.NODE_ENV !== 'production') {
  NavigatorContext.displayName = 'NavigatorContext'
}

export type NavigatorProps = {
  initialRouteName?: Parameters<typeof useNavigationBuilder>[1]['initialRouteName']
  screenOptions?: Parameters<typeof useNavigationBuilder>[1]['screenOptions']
  children?: Parameters<typeof useNavigationBuilder>[1]['children']
  router?: Parameters<typeof useNavigationBuilder>[0]
}

// HYDRATION FIX for SSG/SSR pages inside route groups
//
// Problem: When a page is inside a route group with a <Slot /> layout, hydration causes
// visible flicker. The content is removed and re-added with a timing gap (~300ms).
//
// Root cause: During hydration, react-navigation generates different route keys
// on SSR vs client (using nanoid()). React sees different component keys and
// treats them as different children, causing unmount/remount.
//
// Solution: Deterministic route keys are now generated in getStateFromPath.ts
// using a counter-based approach that produces identical keys on both SSR and
// client. This ensures react-navigation preserves the existing keys instead of
// generating new ones with nanoid().

/** An unstyled custom navigator. Good for basic web layouts */
export function Navigator({
  initialRouteName,
  screenOptions,
  children,
  router,
}: NavigatorProps) {
  const contextKey = useContextKey()

  // Allows adding Screen components as children to configure routes.
  const {
    screens,
    children: otherSlot,
    protectedScreens,
  } = useFilterScreenChildren(children, {
    isCustomNavigator: true,
    contextKey,
  })

  // Register protected routes globally so linkTo can block navigation to them
  // Register immediately (not just in effect) to catch navigation attempts during first render
  registerProtectedRoutes(contextKey, protectedScreens)

  React.useEffect(() => {
    registerProtectedRoutes(contextKey, protectedScreens)
    return () => {
      unregisterProtectedRoutes(contextKey)
    }
  }, [contextKey, protectedScreens])

  const sorted = useSortedScreens(screens ?? [], { protectedScreens })

  if (!sorted.length) {
    console.warn(`Navigator at "${contextKey}" has no children.`)
    return null
  }

  return (
    <QualifiedNavigator
      initialRouteName={initialRouteName}
      screenOptions={screenOptions}
      screens={sorted}
      contextKey={contextKey}
      router={router}
    >
      {otherSlot}
    </QualifiedNavigator>
  )
}

function QualifiedNavigator({
  initialRouteName,
  screenOptions,
  children,
  screens,
  contextKey,
  router = StackRouter,
}: NavigatorProps & { contextKey: string; screens: React.ReactNode[] }) {
  // LATE MOUNT FIX: when a parent layout conditionally renders (auth gate,
  // suspense resolve, provider init, etc.), this navigator may mount after
  // initialState was consumed by NavigationContainer. compute the correct
  // initialRouteName from the original URL so the navigator starts on the
  // right route instead of defaulting to the first child. uses
  // initialPathname (captured at setup) instead of window.location.pathname
  // because React Navigation's linking can push a wrong URL during the delay.
  //
  // resolution uses the linking config's getStateFromPath — the same
  // function NavigationContainer uses to build the initial state — and
  // walks the resulting nested state down to this navigator's depth. that
  // covers both:
  //   - sibling route groups, e.g. `(public)` vs `(authed)` at the root
  //     (pattern matching alone ties at specificity 0 because group
  //     segments don't appear in URLs)
  //   - hoisted deep dynamic routes, e.g. `project/[projectId]/index` as
  //     a flat sibling under (app) when there's no intermediate _layout
  //     (seen in soot, commit ea96e360 — picking the first sibling mounts
  //     `index` while the browser URL is still /project/foo)
  // when this navigator is mounting because the user navigated to a path that
  // targets a screen inside it (e.g. clicking /docs/sootsim while the docs
  // navigator hasn't been mounted yet), getNavigateAction encodes the deep
  // target as the parent route's `params.screen` chain. read that directly
  // here so we don't have to re-derive it from a URL — useful in prod where
  // React Navigation's params consumption can race the late mount and leave
  // the navigator on the first alphabetical screen (e.g. `index`) instead of
  // the actual target.
  const parentRoute = React.useContext(NavigationRouteContext)
  const screenFromParent =
    parentRoute &&
    typeof parentRoute.params === 'object' &&
    parentRoute.params !== null &&
    typeof (parentRoute.params as any).screen === 'string'
      ? (parentRoute.params as any).screen
      : undefined

  const resolvedInitialRouteName = React.useMemo(() => {
    if (initialRouteName) return initialRouteName

    if (screenFromParent) {
      const hasScreen = screens.some(
        (s) => (s as any)?.props?.name === screenFromParent
      )
      if (hasScreen) return screenFromParent
    }

    const browserPath =
      initialPathname ??
      (typeof window !== 'undefined' ? window.location.pathname : undefined)
    if (!browserPath) return undefined

    const resolved = resolveInitialRouteFromLinking(contextKey, browserPath)
    if (!resolved) return undefined

    // only return a name that is actually one of this navigator's screens.
    // if the linking state's depth doesn't line up with screens here (e.g.
    // a custom navigator that filters screens), fall back to letting react
    // navigation pick its default.
    const hasScreen = screens.some(
      (s) => (s as any)?.props?.name === resolved
    )
    return hasScreen ? resolved : undefined
  }, [initialRouteName, screens, contextKey, screenFromParent])

  const { state, navigation, descriptors, NavigationContent } = useNavigationBuilder(
    router,
    {
      // Used for getting the parent with navigation.getParent('/normalized/path')
      id: contextKey,
      children: screens,
      screenOptions,
      initialRouteName: resolvedInitialRouteName,
    }
  )

  // HYDRATION FIX: Use ref for descriptors to avoid context invalidation during hydration.
  // The descriptors object changes by reference on each render from useNavigationBuilder,
  // but the actual content is the same. By using a ref, we prevent unnecessary re-renders
  // that cause React to abandon hydration and remount the component tree.
  const descriptorsRef = React.useRef(descriptors)
  descriptorsRef.current = descriptors

  const value = React.useMemo(() => {
    return {
      contextKey,
      state,
      navigation,
      descriptorsRef,
      router,
    }
  }, [contextKey, state, navigation, router])

  return (
    <NavigatorContext.Provider value={value}>
      <NavigationContent>{children}</NavigationContent>
    </NavigatorContext.Provider>
  )
}

export function useNavigatorContext() {
  const context = React.useContext(NavigatorContext)
  if (!context) {
    throw new Error('useNavigatorContext must be used within a <Navigator />')
  }
  return context
}

export function useSlot() {
  const context = useNavigatorContext()
  const { state, descriptorsRef } = context
  const notFoundState = useNotFoundState()

  // if not-found state is active, render the not-found component inline
  if (notFoundState) {
    // try to get the route node:
    // 1. use provided notFoundRouteNode if available
    // 2. look up by notFoundPath (from server)
    // 3. fall back to finding nearest from original path
    const notFoundRouteNode =
      notFoundState.notFoundRouteNode ||
      findRouteNodeByPath(notFoundState.notFoundPath, globalRouteNode) ||
      findNearestNotFoundRoute(notFoundState.originalPath, globalRouteNode)

    if (notFoundRouteNode) {
      const NotFoundComponent = getQualifiedRouteComponent(notFoundRouteNode)
      return <NotFoundComponent key="one-not-found-inline" route={{ params: {} }} />
    }

    // fallback: return null to prevent rendering the wrong page
    // this handles the edge case where +not-found route can't be found
    return null
  }

  if (!state.routes) {
    return null
  }

  const current = state.routes[state.index]

  if (!current) {
    return null
  }

  const renderedElement = descriptorsRef.current[current.key]?.render() ?? null

  // Use key based on route name to prevent layout remounts when route keys change
  // (same route, different key), while allowing React to swap components when
  // the actual route changes (e.g. late-mounting navigator correcting its state).
  if (renderedElement !== null) {
    return React.cloneElement(renderedElement, {
      key: `${SLOT_STATIC_KEY}-${current.name}`,
    })
  }

  return renderedElement
}

/** Renders the currently selected content. */
export const Slot = React.memo(function Slot(props: Omit<NavigatorProps, 'children'>) {
  const contextKey = useContextKey()
  const context = React.useContext(NavigatorContext)

  // Ensure the context is for the current contextKey
  if (context?.contextKey !== contextKey) {
    // Qualify the content and re-export.
    return (
      <Navigator {...props}>
        <QualifiedSlot />
      </Navigator>
    )
  }

  return <QualifiedSlot />
})

export function QualifiedSlot() {
  return useSlot()
}

export function DefaultNavigator() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Navigator>
        <QualifiedSlot />
      </Navigator>
    </SafeAreaView>
  )
}

Navigator.Slot = Slot
Navigator.useContext = useNavigatorContext

/** Used to configure route settings. */
Navigator.Screen = Screen

// ============================================
// Named Slots for Parallel / Intercepting Routes
// ============================================

/**
 * Create a scoped slot key that includes the layout context.
 * This prevents multiple layouts with the same slot name from sharing state.
 */
export function getScopedSlotKey(slotName: string, layoutContextKey?: string): string {
  if (!layoutContextKey) return slotName
  return `${layoutContextKey}:${slotName}`
}

/**
 * Hook to get the render output for a named slot (e.g., @modal, @sidebar).
 * Returns null if no intercept is active, otherwise returns the intercepted route element.
 *
 * @param slotName - The slot name (e.g., "modal")
 * @param layoutContextKey - The layout's contextKey to scope slot state per-layout
 */
export function useNamedSlot(
  slotName: string,
  layoutContextKey?: string
): React.ReactNode | null {
  // Subscribe to slot state changes
  useSlotStateSubscription()

  const scopedKey = getScopedSlotKey(slotName, layoutContextKey)
  const slotState = getSlotState(scopedKey)

  if (!slotState?.activeRouteKey || !slotState.isIntercepted) {
    // No active intercept - return null (layout can render default)
    return null
  }

  // Render the intercepted route directly using the stored route node
  if (slotState.activeRouteNode) {
    const Component = getQualifiedRouteComponent(slotState.activeRouteNode)
    // Pass params from the intercept match
    return (
      <Component
        key={slotState.activeRouteKey}
        route={{ params: slotState.params || {} }}
      />
    )
  }

  return null
}

/**
 * Named slot component for use in layouts.
 * Renders the slot content if an intercept is active, otherwise renders children (default).
 *
 * @example
 * ```tsx
 * // In a layout file:
 * export default function Layout({ children, modal }) {
 *   return (
 *     <>
 *       {children}
 *       <NamedSlot name="modal">{modal}</NamedSlot>
 *     </>
 *   )
 * }
 * ```
 */
export function NamedSlot({
  name,
  layoutContextKey,
  children,
}: {
  /** The slot name (matches @slotName directory) */
  name: string
  /** The layout's contextKey to scope slot state (prevents duplicate modals across layouts) */
  layoutContextKey?: string
  /** Default content when no intercept is active */
  children?: React.ReactNode
}) {
  const slotContent = useNamedSlot(name, layoutContextKey)

  if (slotContent) {
    return <>{slotContent}</>
  }

  // Render default (could be from default.tsx or children prop)
  return <>{children}</>
}
