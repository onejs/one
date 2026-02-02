// Copyright © 2024 650 Industries.
import {
  type RouterFactory,
  StackRouter,
  useNavigationBuilder,
} from '@react-navigation/native'
import * as React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useFilterScreenChildren } from '../layouts/withLayoutContext'
import { useContextKey } from '../router/Route'
import { registerProtectedRoutes, unregisterProtectedRoutes } from '../router/router'
import { useSortedScreens } from '../router/useScreens'
import { Screen } from './Screen'

// Static key used to prevent React from unmounting/remounting Slot content
// when route keys change during navigation. Since Slot only renders one screen
// at a time anyway, we can safely reuse the same component instance.
const SLOT_STATIC_KEY = 'one-slot-static-key'

type NavigatorTypes = ReturnType<typeof useNavigationBuilder>

// Slot state for parallel routes / intercepting routes
export interface SlotState {
  /** The route key currently being rendered in this slot (null = show default) */
  activeRouteKey: string | null
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
  const { state, navigation, descriptors, NavigationContent } = useNavigationBuilder(
    router,
    {
      // Used for getting the parent with navigation.getParent('/normalized/path')
      id: contextKey,
      children: screens,
      screenOptions,
      initialRouteName,
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

  const current = state.routes.find((route, i) => {
    return state.index === i
  })

  if (!current) {
    return null
  }

  const renderedElement = descriptorsRef.current[current.key]?.render() ?? null

  // Use static key to prevent layout remounts when route keys change during navigation.
  // Safe because Slot only renders one screen at a time.
  // Use cloneElement to properly clone the React element with a new key.
  if (renderedElement !== null) {
    return React.cloneElement(renderedElement, { key: SLOT_STATIC_KEY })
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
 * Hook to get the render output for a named slot (e.g., @modal, @sidebar).
 * Returns null if no intercept is active, otherwise returns the intercepted route element.
 */
export function useNamedSlot(slotName: string): React.ReactNode | null {
  // Subscribe to slot state changes
  useSlotStateSubscription()

  const context = React.useContext(NavigatorContext)
  const slotState = getSlotState(slotName)

  if (!slotState?.activeRouteKey || !slotState.isIntercepted) {
    // No active intercept - return null (layout can render default)
    return null
  }

  // Get the descriptor for the intercepted route
  if (context?.descriptorsRef.current) {
    const descriptor = context.descriptorsRef.current[slotState.activeRouteKey]
    if (descriptor) {
      return descriptor.render()
    }
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
  children,
}: {
  /** The slot name (matches @slotName directory) */
  name: string
  /** Default content when no intercept is active */
  children?: React.ReactNode
}) {
  const slotContent = useNamedSlot(name)

  if (slotContent) {
    return <>{slotContent}</>
  }

  // Render default (could be from default.tsx or children prop)
  return <>{children}</>
}
