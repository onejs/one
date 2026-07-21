import type { EventMapBase, NavigationState } from '@react-navigation/native'
import React from 'react'
import type { OneRouter } from '../interfaces/router'
import { getContextKey, stripInvisibleSegmentsFromPath } from '../router/matchers'
import { useContextKey, useRouteNode } from '../router/Route'
import {
  registerProtectedRoutes,
  replace,
  resolveProtectedHref,
  routeInfo,
  unregisterProtectedRoutes,
} from '../router/router'
import { type ScreenProps, useSortedScreens } from '../router/useScreens'
import { sortRoutesWithInitial } from '../router/sortRoutes'
import type { PickPartial } from '../types'
import { withStaticProperties } from '../utils/withStaticProperties'
import { isProtectedElement } from '../views/Protected'
import { Screen } from '../views/Screen'
import { StackScreen } from './stack-utils/StackScreen'

export function useFilterScreenChildren(
  children: React.ReactNode,
  {
    isCustomNavigator,
    contextKey,
  }: {
    isCustomNavigator?: boolean
    /** Used for sending developer hints */
    contextKey?: string
  } = {}
) {
  return React.useMemo(() => {
    const customChildren: any[] = []
    const screens: any[] = []
    const protectedScreens = new Set<string>()
    const guardedRedirects = new Map<string, OneRouter.Href | undefined>()

    /**
     * Recursively process children, handling Protected elements.
     * When exclude is true, all Screen children are added to protectedScreens instead of screens.
     */
    function flattenChild(
      child: React.ReactNode,
      exclude = false,
      redirectTo?: OneRouter.Href
    ) {
      // Handle Screen or StackScreen elements
      if (
        React.isValidElement(child) &&
        (child.type === Screen || child.type === StackScreen)
      ) {
        if (
          typeof child.props === 'object' &&
          child.props &&
          'name' in child.props &&
          !child.props.name
        ) {
          throw new Error(
            `<Screen /> component in \`default export\` at \`app${contextKey}/_layout\` must have a \`name\` prop when used as a child of a Layout Route.`
          )
        }
        if (process.env.NODE_ENV !== 'production') {
          if (
            ['children', 'component', 'getComponent'].some(
              (key) =>
                child.props && typeof child.props === 'object' && key in child.props
            )
          ) {
            throw new Error(
              `<Screen /> component in \`default export\` at \`app${contextKey}/_layout\` must not have a \`children\`, \`component\`, or \`getComponent\` prop when used as a child of a Layout Route`
            )
          }
        }

        const screenProps = child.props as ScreenProps
        if (exclude && screenProps.name) {
          protectedScreens.add(screenProps.name)
          guardedRedirects.set(screenProps.name, redirectTo)
        } else {
          screens.push(screenProps)
        }
        return
      }

      // Handle Protected elements - recursively process children with guard logic
      if (isProtectedElement(child)) {
        const guardFails = !child.props.guard
        const excludeChildren = exclude || guardFails
        const childRedirectTo = guardFails ? child.props.redirectTo : redirectTo
        React.Children.forEach(child.props.children, (nested) => {
          flattenChild(nested, excludeChildren, childRedirectTo)
        })
        return
      }

      // Handle other children (custom components in custom Navigator)
      if (isCustomNavigator) {
        customChildren.push(child)
      } else if (child != null) {
        console.warn(
          `Layout children must be of type Screen, all other children are ignored. To use custom children, create a custom <Layout />. Update Layout Route at: "app${contextKey}/_layout"`
        )
      }
    }

    React.Children.forEach(children, (child) => flattenChild(child))

    // Add an assertion for development
    if (process.env.NODE_ENV !== 'production') {
      // Assert if names are not unique
      const names = screens.map((screen) => screen.name)
      if (names && new Set(names).size !== names.length) {
        throw new Error('Screen names must be unique: ' + names)
      }
    }

    return {
      screens,
      children: customChildren,
      protectedScreens,
      guardedRedirects,
    }
  }, [children, contextKey, isCustomNavigator])
}

export function useResolvedGuardedRedirects(
  guardedRedirects: Map<string, OneRouter.Href | undefined>
) {
  const node = useRouteNode()

  return React.useMemo(() => {
    if (!node) {
      return guardedRedirects
    }

    const defaultRoute = [...node.children]
      .sort(sortRoutesWithInitial(node.initialRouteName))
      .find((child) => {
        const normalized = child.route.replace(/\/index$/, '')
        return !(guardedRedirects.has(child.route) || guardedRedirects.has(normalized))
      })
    const defaultHref = defaultRoute
      ? stripInvisibleSegmentsFromPath(getContextKey(defaultRoute.contextKey)) || '/'
      : undefined

    return new Map(
      Array.from(guardedRedirects, ([name, redirectTo]) => [
        name,
        redirectTo ?? defaultHref,
      ])
    )
  }, [guardedRedirects, node])
}

/** Return a navigator that automatically injects matched routes and renders nothing when there are no children. Return type with children prop optional */
export function withLayoutContext<
  TOptions extends object,
  T extends React.ComponentType<any>,
  State extends NavigationState,
  EventMap extends EventMapBase,
>(
  Nav: T,
  processor?: (
    options: ScreenProps<TOptions, State, EventMap>[]
  ) => ScreenProps<TOptions, State, EventMap>[],
  options?: { props: any }
) {
  return withStaticProperties(
    React.forwardRef<unknown, PickPartial<React.ComponentProps<T>, 'children'>>(
      (propsIn, ref) => {
        const { children, ...props } = propsIn as React.ComponentProps<T>
        const contextKey = useContextKey()
        const { screens, protectedScreens, guardedRedirects } = useFilterScreenChildren(
          children,
          { contextKey }
        )
        const resolvedGuardedRedirects = useResolvedGuardedRedirects(guardedRedirects)

        // Register protected routes globally so linkTo can block navigation to them
        // Register immediately (not just in effect) to catch navigation attempts during first render
        registerProtectedRoutes(contextKey, resolvedGuardedRedirects)

        const currentPathname = routeInfo?.pathname
        const protectedHref = currentPathname
          ? resolveProtectedHref(currentPathname)
          : currentPathname

        React.useEffect(() => {
          registerProtectedRoutes(contextKey, resolvedGuardedRedirects)
          return () => {
            unregisterProtectedRoutes(contextKey)
          }
        }, [contextKey, resolvedGuardedRedirects])

        React.useEffect(() => {
          if (currentPathname && protectedHref && protectedHref !== currentPathname) {
            replace(protectedHref)
          }
        }, [currentPathname, protectedHref])

        const processed = processor ? processor(screens ?? ([] as any)) : screens
        const sorted = useSortedScreens((processed ?? []) as any, {
          onlyMatching: true,
          protectedScreens,
        })

        // Prevent throwing an error when there are no screens.
        if (!sorted.length) {
          return null
        }

        return (
          <Nav {...options?.props} {...props} id={contextKey} ref={ref}>
            {sorted}
          </Nav>
        )
      }
    ),
    {
      Screen,
    }
  )
}
