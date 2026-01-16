// Copyright © 2024 650 Industries.
import { type RouterFactory, StackRouter, useNavigationBuilder } from '@react-navigation/native'
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

// TODO: This might already exist upstream, maybe something like `useCurrentRender` ?
export const NavigatorContext = React.createContext<{
  contextKey: string
  state: NavigatorTypes['state']
  navigation: NavigatorTypes['navigation']
  descriptors: NavigatorTypes['descriptors']
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

  const value = React.useMemo(() => {
    return {
      contextKey,
      state,
      navigation,
      descriptors,
      router,
    }
  }, [contextKey, state, navigation, descriptors, router])

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
  const { state, descriptors } = context

  const current = state.routes.find((route, i) => {
    return state.index === i
  })

  if (!current) {
    return null
  }

  const renderedElement = descriptors[current.key]?.render() ?? null

  // Use static key to prevent layout remounts when route keys change during navigation.
  // Safe because Slot only renders one screen at a time.
  if (renderedElement !== null) {
    return {
      ...renderedElement,
      key: SLOT_STATIC_KEY,
    }
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
