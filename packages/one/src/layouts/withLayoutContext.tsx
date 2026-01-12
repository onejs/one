import type { EventMapBase, NavigationState } from '@react-navigation/native'
import React from 'react'
import { useContextKey } from '../router/Route'
import { registerProtectedRoutes, unregisterProtectedRoutes } from '../router/router'
import { type ScreenProps, useSortedScreens } from '../router/useScreens'
import type { PickPartial } from '../types'
import { withStaticProperties } from '../utils/withStaticProperties'
import { isProtectedElement } from '../views/Protected'
import { Screen } from '../views/Screen'

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

    /**
     * Recursively process children, handling Protected elements.
     * When exclude is true, all Screen children are added to protectedScreens instead of screens.
     */
    function flattenChild(child: React.ReactNode, exclude = false) {
      // Handle Screen elements
      if (React.isValidElement(child) && child.type === Screen) {
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
        } else {
          screens.push(screenProps)
        }
        return
      }

      // Handle Protected elements - recursively process children with guard logic
      if (isProtectedElement(child)) {
        // Key logic: exclude if parent excluded OR guard is false
        const excludeChildren = exclude || !child.props.guard
        React.Children.forEach(child.props.children, (nested) => {
          flattenChild(nested, excludeChildren)
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
    }
  }, [children, contextKey, isCustomNavigator])
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
        const { screens, protectedScreens } = useFilterScreenChildren(children, {
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
