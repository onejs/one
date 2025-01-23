import { createNavigatorFactory } from '@react-navigation/core'
import { SafeAreaProviderCompat } from '@react-navigation/elements'
import type {
  EventMapBase,
  NavigationState,
  ParamListBase,
  RouteProp,
  ScreenListeners,
} from '@react-navigation/native'
import React, { forwardRef, Suspense, useEffect } from 'react'
import { getPageExport } from '../utils/getPageExport'
import { getServerContext, ServerContextScript } from '../utils/serverContext'
import { useConstant } from '../utils/useConstant'
import { EmptyRoute } from '../views/EmptyRoute'
import { RootErrorBoundary } from '../views/RootErrorBoundary'
import { Try } from '../views/Try'
import { DevHead } from '../vite/DevHead'
import { filterRootHTML } from './filterRootHTML'
import {
  Route,
  useRouteNode,
  type DynamicConvention,
  type LoadedRoute,
  type RouteNode,
} from './Route'
import { sortRoutesWithInitial } from './sortRoutes'

// `@react-navigation/core` does not expose the Screen or Group components directly, so we have to
// do this hack.
export const { Screen, Group } = createNavigatorFactory({} as any)()

export type ScreenProps<
  TOptions extends Record<string, any> = Record<string, any>,
  State extends NavigationState = NavigationState,
  EventMap extends EventMapBase = EventMapBase,
> = {
  /** Name is required when used inside a Layout component. */
  name?: string
  /**
   * Redirect to the nearest sibling route.
   * If all children are redirect={true}, the layout will render `null` as there are no children to render.
   */
  redirect?: boolean
  initialParams?: Record<string, any>
  options?: TOptions

  listeners?:
    | ScreenListeners<State, EventMap>
    | ((prop: {
        route: RouteProp<ParamListBase, string>
        navigation: any
      }) => ScreenListeners<State, EventMap>)

  getId?: ({ params }: { params?: Record<string, any> }) => string | undefined
}

function getSortedChildren(
  children: RouteNode[],
  order?: ScreenProps[],
  initialRouteName?: string,
  options?: { onlyMatching?: boolean }
): { route: RouteNode; props: Partial<ScreenProps> }[] {
  if (!order?.length) {
    return children
      .sort(sortRoutesWithInitial(initialRouteName))
      .map((route) => ({ route, props: {} }))
  }

  const entries = [...children]

  const ordered = order
    .map(({ name, redirect, initialParams, listeners, options, getId }) => {
      if (!entries.length) {
        console.warn(`[Layout children]: Too many screens defined. Route "${name}" is extraneous.`)
        return null
      }
      const matchIndex = entries.findIndex((child) => child.route === name)
      if (matchIndex === -1) {
        console.warn(
          `[Layout children]: No route named "${name}" exists in nested children:`,
          children.map(({ route }) => route)
        )
        return null
      }
      // Get match and remove from entries
      const match = entries[matchIndex]
      entries.splice(matchIndex, 1)

      // Ensure to return null after removing from entries.
      if (redirect) {
        if (typeof redirect === 'string') {
          throw new Error(`Redirecting to a specific route is not supported yet.`)
        }
        return null
      }

      return {
        route: match,
        props: { initialParams, listeners, options, getId },
      }
    })
    .filter(Boolean) as {
    route: RouteNode
    props: Partial<ScreenProps>
  }[]

  // Add any remaining children
  if (!options?.onlyMatching) {
    ordered.push(
      ...entries
        .sort(sortRoutesWithInitial(initialRouteName))
        .map((route) => ({ route, props: {} }))
    )
  }

  return ordered
}

/**
 * @returns React Navigation screens sorted by the `route` property.
 */
export function useSortedScreens(
  order: ScreenProps[],
  options?: { onlyMatching?: boolean }
): React.ReactNode[] {
  const node = useRouteNode()

  const sortedScreens = React.useMemo(() => {
    const sorted = node?.children?.length
      ? getSortedChildren(node.children, order, node.initialRouteName, options)
      : []

    return sorted.map((value) => routeToScreen(value.route, value.props))
  }, [node?.children, node?.initialRouteName, order])

  return sortedScreens
}

function fromImport({ ErrorBoundary, ...component }: LoadedRoute) {
  if (ErrorBoundary) {
    return {
      default: React.forwardRef((props: any, ref: any) => {
        const children = React.createElement(getPageExport(component) || EmptyRoute, {
          ...props,
          ref,
        })
        return <Try catch={ErrorBoundary}>{children}</Try>
      }),
    }
  }
  if (process.env.NODE_ENV !== 'production') {
    const exported = getPageExport(component)
    if (exported && typeof exported === 'object' && Object.keys(exported).length === 0) {
      return { default: EmptyRoute }
    }
  }

  return { default: getPageExport(component) }
}

// TODO: Maybe there's a more React-y way to do this?
// Without this store, the process enters a recursive loop.
const qualifiedStore = new WeakMap<RouteNode, React.ComponentType<any>>()

/** Wrap the component with various enhancements and add access to child routes. */
export function getQualifiedRouteComponent(value: RouteNode) {
  if (value && qualifiedStore.has(value)) {
    return qualifiedStore.get(value)!
  }

  let ScreenComponent: React.ForwardRefExoticComponent<{ segment: string; key?: string }>

  ScreenComponent = React.forwardRef((props, ref) => {
    const res = value.loadRoute()
    const Component = useConstant(() => {
      const BaseComponent = getPageExport(fromImport(res)) as React.ComponentType<any>

      // root layout do special html handling only
      if (props.segment === '') {
        return forwardRef((props, ref) => {
          // @ts-expect-error
          const out = BaseComponent(props, ref)
          const { children, bodyProps, head, htmlProps } = filterRootHTML(out)
          const { children: headChildren, ...headProps } = head?.props || {}

          const serverContext = getServerContext()

          if (process.env.TAMAGUI_TARGET === 'native') {
            // on native we just ignore all html/body/head
            return children
          }

          const contents = (
            <>
              <head key="head" {...headProps}>
                <DevHead />
                <script
                  dangerouslySetInnerHTML={{
                    __html: `globalThis['global'] = globalThis`,
                  }}
                />
                {serverContext?.css?.map((file) => {
                  return <link key={file} rel="stylesheet" href={file} />
                })}
                <ServerContextScript />
                {headChildren}
              </head>
              <body key="body" suppressHydrationWarning {...bodyProps}>
                <SafeAreaProviderCompat>{children}</SafeAreaProviderCompat>
              </body>
            </>
          )

          return (
            // tamagui and libraries can add className on hydration to have ssr safe styling
            // so supress hydration warnings here
            <html suppressHydrationWarning lang="en-US" {...htmlProps}>
              {contents}
            </html>
          )
        })
      }

      return BaseComponent
    })

    if (process.env.NODE_ENV === 'development' && process.env.DEBUG === 'one') {
      console.groupCollapsed(`Render ${props.key} ${props.segment}`)
      console.info(`res`, res)
      console.info(`value`, value)
      console.info(`fromImport`, fromImport(res))
      console.info(`Component`, Component)
      console.groupEnd()
    }

    return (
      // <Suspense fallback={null}>
      <Component {...props} ref={ref} />
      // </Suspense>
    )
  })

  const wrapSuspense = (children: any) => {
    if (process.env.TAMAGUI_TARGET === 'native') {
      return <Suspense fallback={<SuspenseFallback route={value} />}>{children}</Suspense>
    }
    // on web avoiding suspense for now
    // its causing page flickers, we need to make sure we wrap loaders + page nav
    // in startTransition
    return children
  }

  const getLoadable = (props: any, ref: any) => {
    return (
      <RootErrorBoundary>
        {wrapSuspense(
          <ScreenComponent
            {...{
              ...props,
              ref,
              // Expose the template segment path, e.g. `(home)`, `[foo]`, `index`
              // the intention is to make it possible to deduce shared routes.
              segment: value.route,
            }}
          />
        )}
      </RootErrorBoundary>
    )
  }

  const SuspenseFallback = ({ route }: { route: RouteNode }) => {
    useEffect(() => {
      // console.info(`⚠️ Suspended:`, route)
    }, [route])

    return null
  }

  const QualifiedRoute = React.forwardRef(
    (
      {
        // Remove these React Navigation props to
        // enforce usage of router hooks (where the query params are correct).
        route,
        navigation,

        // Pass all other props to the component
        ...props
      }: any,
      ref: any
    ) => {
      const loadable = getLoadable(props, ref)
      return (
        <Route route={route} node={value}>
          {loadable}
        </Route>
      )
    }
  )

  QualifiedRoute.displayName = `Route(${value.route})`

  qualifiedStore.set(value, QualifiedRoute)
  return QualifiedRoute
}

/** @returns a function which provides a screen id that matches the dynamic route name in params. */
export function createGetIdForRoute(
  route: Pick<RouteNode, 'dynamic' | 'route' | 'contextKey' | 'children'>
) {
  const include = new Map<string, DynamicConvention>()

  if (route.dynamic) {
    for (const segment of route.dynamic) {
      include.set(segment.name, segment)
    }
  }

  return ({ params = {} } = {} as { params?: Record<string, any> }) => {
    const segments: string[] = []

    for (const dynamic of include.values()) {
      const value = params?.[dynamic.name]
      if (Array.isArray(value) && value.length > 0) {
        // If we are an array with a value
        segments.push(value.join('/'))
      } else if (value && !Array.isArray(value)) {
        // If we have a value and not an empty array
        segments.push(value)
      } else if (dynamic.deep) {
        segments.push(`[...${dynamic.name}]`)
      } else {
        segments.push(`[${dynamic.name}]`)
      }
    }

    return segments.join('/') ?? route.contextKey
  }
}

function routeToScreen(route: RouteNode, { options, ...props }: Partial<ScreenProps> = {}) {
  return (
    <Screen
      // Users can override the screen getId function.
      getId={createGetIdForRoute(route)}
      {...props}
      name={route.route}
      key={route.route}
      options={(args) => {
        // Only eager load generated components
        const staticOptions = route.generated ? route.loadRoute()?.getNavOptions : null
        const staticResult =
          typeof staticOptions === 'function' ? staticOptions(args) : staticOptions
        const dynamicResult = typeof options === 'function' ? options?.(args) : options
        const output = {
          ...staticResult,
          ...dynamicResult,
        }

        // Prevent generated screens from showing up in the tab bar.
        if (route.generated) {
          output.tabBarButton = () => null
          // TODO: React Navigation doesn't provide a way to prevent rendering the drawer item.
          output.drawerItemStyle = { height: 0, display: 'none' }
        }

        return output
      }}
      getComponent={() => {
        // log here to see which route is rendered
        // console.log('getting', route, getQualifiedRouteComponent(route))
        return getQualifiedRouteComponent(route)
      }}
    />
  )
}
