import { createNavigatorFactory } from '@react-navigation/core'
import type {
  EventMapBase,
  NavigationState,
  ParamListBase,
  RouteProp,
  ScreenListeners,
} from '@react-navigation/native'
import React, { memo, Suspense, useContext, useEffect, useState } from 'react'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { ServerContextScript } from '../server/ServerContextScript'
import { checkSkewAndReload } from '../skewProtection'
import { getClientMatchesSnapshot } from '../useMatches'
import { handleSkewError, isChunkLoadError } from '../utils/dynamicImport'
import { getPageExport } from '../utils/getPageExport'
import { EmptyRoute } from '../views/EmptyRoute'
import { NamedSlot } from '../views/Navigator'
import { RouteErrorView } from '../views/RouteErrorView'
import type { SuspenseFallbackProps } from '../views/SuspenseFallback'
import { Try } from '../views/Try'
import { DevHead } from '../vite/DevHead'
import { getServerContext, useServerContext } from '../vite/one-server-only'
import { filterRootHTML } from './filterRootHTML'
import {
  type DynamicConvention,
  type LoadedRoute,
  Route,
  type RouteNode,
  RouteParamsContext,
  SuspenseFallbackContext,
  useRouteNode,
} from './Route'
import { getRouteHmrEpoch, subscribeRouteHmr } from './routeHmr'
import { SpaShellContext } from './SpaShellContext'
import { sortRoutesWithInitial } from './sortRoutes'

// `@react-navigation/core` does not expose the Screen or Group components directly, so we have to
// do this hack.

/**
 * Recursively check if React children contain a <meta charSet /> element.
 * This is used to warn developers if they're missing the charset meta tag
 * which can cause React hydration issues due to encoding mismatch.
 */
function hasMetaCharset(children: React.ReactNode): boolean {
  if (process.env.NODE_ENV === 'development') {
    if (!children) return false

    const checkElement = (child: React.ReactNode): boolean => {
      if (!React.isValidElement(child)) return false

      // check if this is a <meta charSet /> or <meta charset />
      if (child.type === 'meta') {
        const props = child.props as Record<string, unknown>
        if ('charSet' in props || 'charset' in props) {
          return true
        }
      }

      // recurse into children
      const childProps = child.props as { children?: React.ReactNode }
      if (childProps.children) {
        return hasMetaCharset(childProps.children)
      }

      return false
    }

    if (Array.isArray(children)) {
      return children.some(checkElement)
    }

    return checkElement(children)
  }

  return true
}

export const { Screen, Group } = createNavigatorFactory({} as any)()

// Cache inline CSS elements at module load (before React hydrates).
// Reads CSS content from SSR'd <style> elements and creates matching JSX
// so hydration sees identical content without 100KB+ JSON payload.
// Also captures <link> stylesheet elements for mixed inline/link CSS mode.
const cachedInlineCSSElements: React.ReactNode[] =
  // require a real DOM query API, not just a (possibly polyfilled on
  // Expo/Hermes) `document` global — see getSafeWindowPathname in router.ts
  typeof document !== 'undefined' && typeof document.querySelectorAll === 'function'
    ? (() => {
        const elements: React.ReactNode[] = []
        // collect all SSR CSS elements in order (both inline <style> and <link>)
        const cssElements = document.querySelectorAll<HTMLElement>(
          'style[id^="__one_css_"], link[rel="stylesheet"][data-one-css]'
        )
        cssElements.forEach((el, i) => {
          if (el.tagName === 'STYLE') {
            elements.push(
              <style
                key={`inline-css-${i}`}
                id={el.id}
                dangerouslySetInnerHTML={{ __html: el.innerHTML }}
              />
            )
          } else {
            const href = el.getAttribute('href')!
            elements.push(
              <link key={href} rel="stylesheet" href={href} data-one-css="" />
            )
          }
        })
        return elements
      })()
    : []

// zeroed so ssr and the first client render match; the provider measures the
// real insets and frame from css env() on mount
const SSR_SAFE_METRICS = {
  frame: { x: 0, y: 0, width: 0, height: 0 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
}

/**
 * Separate component for rendering root layouts with HTML.
 * This is extracted into its own component so React's HMR can properly track changes.
 * When the LayoutComponent prop changes, React will re-render this component.
 */
function RootLayoutRenderer({
  LayoutComponent,
  layoutProps,
  forwardedRef,
}: {
  LayoutComponent: React.ComponentType<any>
  layoutProps: any
  forwardedRef: any
}) {
  // HMR support: force re-render when layout changes (dev only, web only)
  if (process.env.NODE_ENV === 'development' && process.env.TAMAGUI_TARGET !== 'native') {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [, setHmrKey] = useState(0)
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      const handler = () => setHmrKey((k) => k + 1)
      window.addEventListener('one-hmr-update', handler)
      return () => window.removeEventListener('one-hmr-update', handler)
    }, [])
  }

  // Call the layout component to get its output for HTML filtering
  // @ts-expect-error
  const out = LayoutComponent(layoutProps, forwardedRef)

  const { children, bodyProps, head, htmlProps } = filterRootHTML(out)
  const { children: headChildren, ...headProps } = (head?.props || {}) as Record<
    string,
    any
  >
  const serverContext = useServerContext()

  let finalChildren = children

  if (process.env.TAMAGUI_TARGET === 'native') {
    // on native we just ignore all html/body/head
    return finalChildren
  }

  if (process.env.NODE_ENV === 'development') {
    // check if <meta charSet /> is present in head children
    // if not, warn that it must be set in root _layout.tsx or else
    // React will have hydration issues as it switches encoding
    if (!hasMetaCharset(headChildren)) {
      console.warn(
        `[one] Missing <meta charSet="utf-8" /> in your root _layout.tsx <head>. ` +
          `This can cause React hydration issues due to encoding mismatch. ` +
          `Add it as the first element in your <head> tag.`
      )
    }
  }

  finalChildren = (
    <>
      <head key="head" {...headProps}>
        <DevHead />
        <script
          dangerouslySetInnerHTML={{
            __html: `globalThis['global'] = globalThis`,
          }}
        />
        {serverContext?.cssContents?.length || serverContext?.cssInlineCount
          ? // inline/mixed CSS: render each entry as <style> (if content) or <link>
            serverContext?.cssContents
            ? serverContext.cssContents.map((content, i) =>
                content ? (
                  <style
                    key={`inline-css-${i}`}
                    id={`__one_css_${i}`}
                    dangerouslySetInnerHTML={{ __html: content }}
                  />
                ) : serverContext.css?.[i] ? (
                  <link
                    key={serverContext.css[i]}
                    rel="stylesheet"
                    href={serverContext.css![i]}
                  />
                ) : null
              )
            : cachedInlineCSSElements
          : serverContext?.css?.map((file) => (
              <link key={file} rel="stylesheet" href={file} />
            ))}
        <ServerContextScript />
        {headChildren}
      </head>
      <body key="body" suppressHydrationWarning {...bodyProps}>
        <SafeAreaProvider initialMetrics={SSR_SAFE_METRICS}>
          {finalChildren}
        </SafeAreaProvider>
      </body>
    </>
  )

  return (
    // tamagui and libraries can add className on hydration to have ssr safe styling
    // so supress hydration warnings here
    <html suppressHydrationWarning lang="en-US" {...htmlProps}>
      {finalChildren}
    </html>
  )
}

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
        console.warn(
          `[Layout children]: Too many screens defined. Route "${name}" is extraneous.`
        )
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
  options?: {
    onlyMatching?: boolean
    /** Set of route names to filter out (protected routes with guard=false) */
    protectedScreens?: Set<string>
  }
): React.ReactNode[] {
  const node = useRouteNode()

  const sortedScreens = React.useMemo(() => {
    const sorted = node?.children?.length
      ? getSortedChildren(node.children, order, node.initialRouteName, options)
      : []

    return sorted
      .filter((value) => {
        const routeName = value.route.route
        const normalized = routeName.replace(/\/index$/, '')
        return !(
          options?.protectedScreens?.has(routeName) ||
          options?.protectedScreens?.has(normalized)
        )
      })
      .map((value) => routeToScreen(value.route, value.props))
  }, [node?.children, node?.initialRouteName, order, options?.protectedScreens])

  return sortedScreens
}

function fromImport({ ErrorBoundary, SuspenseFallback, ...component }: LoadedRoute) {
  if (ErrorBoundary) {
    return {
      default: React.forwardRef((props: any, ref: any) => {
        const children = React.createElement(getPageExport(component) || EmptyRoute, {
          ...props,
          ref,
        })
        return <Try catch={ErrorBoundary}>{children}</Try>
      }),
      SuspenseFallback,
    }
  }
  if (process.env.NODE_ENV !== 'production') {
    const exported = getPageExport(component)
    if (exported && typeof exported === 'object' && Object.keys(exported).length === 0) {
      return { default: EmptyRoute, SuspenseFallback }
    }
  }

  return { default: getPageExport(component), SuspenseFallback }
}

function RouteSuspenseFallback({
  component: Component,
  route,
}: {
  component?: React.ComponentType<SuspenseFallbackProps>
  route: string
}) {
  const params = useContext(RouteParamsContext)
  return Component ? (
    <Component route={route} params={(params ?? {}) as SuspenseFallbackProps['params']} />
  ) : null
}

// TODO: Maybe there's a more React-y way to do this?
// Without this store, the process enters a recursive loop.
const qualifiedStore = new WeakMap<RouteNode, React.ComponentType<any>>()

function getRouteMatchesForProps() {
  const serverMatches = getServerContext()?.matches ?? []

  if (process.env.VITE_ENVIRONMENT === 'ssr') {
    return serverMatches
  }

  const clientMatches = getClientMatchesSnapshot()
  return clientMatches.length ? clientMatches : serverMatches
}

/** Wrap the component with various enhancements and add access to child routes. */
export function getQualifiedRouteComponent(value: RouteNode) {
  if (value && qualifiedStore.has(value)) {
    return qualifiedStore.get(value)!
  }

  const ScreenComponent = React.forwardRef((props: any, ref) => {
    // HMR support: force re-render when layout files change to get fresh module (dev only, web only)
    if (
      process.env.NODE_ENV === 'development' &&
      process.env.TAMAGUI_TARGET !== 'native'
    ) {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const [, setHmrKey] = useState(0)
      // eslint-disable-next-line react-hooks/rules-of-hooks
      useEffect(() => {
        const handler = () => setHmrKey((k) => k + 1)
        window.addEventListener('one-hmr-update', handler)
        return () => window.removeEventListener('one-hmr-update', handler)
      }, [])
    }

    // native Fast Refresh: subscribe to the route-hot epoch (the routeHmr.native
    // store bumps it when vxrn reports a route module update) so this component
    // re-renders and re-runs loadRoute() to pick up the edited module's exports
    if (
      process.env.NODE_ENV === 'development' &&
      process.env.TAMAGUI_TARGET === 'native'
    ) {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      React.useSyncExternalStore(subscribeRouteHmr, getRouteHmrEpoch, getRouteHmrEpoch)
    }

    // in spa-shell mode, only SSG/SSR layouts render on the server.
    // SPA layouts and leaf pages get a placeholder, swapped for real
    // content after hydration.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const isSpaShell = useContext(SpaShellContext)
    const InheritedSuspenseFallback = useContext(SuspenseFallbackContext)
    const matches = getRouteMatchesForProps()

    if (isSpaShell && props.segment !== '') {
      const isServerRenderedLayout =
        value.children?.length &&
        (value.layoutRenderMode === 'ssg' || value.layoutRenderMode === 'ssr')
      if (!isServerRenderedLayout) {
        return <div data-one-spa-content="" />
      }
    }

    const res = fromImport(value.loadRoute())
    const Component = getPageExport(res) as React.ComponentType<any>
    const LayoutSuspenseFallback =
      value.type === 'layout' ? res.SuspenseFallback : undefined
    const match =
      matches.find((match) => match.routeId === value.contextKey) ||
      (!value.children?.length ? matches[matches.length - 1] : undefined)
    const loaderDataProps =
      match && 'loaderData' in match ? { loaderData: match.loaderData } : {}

    if (process.env.NODE_ENV === 'development' && process.env.DEBUG === 'one') {
      console.groupCollapsed(`Render ${props.key} ${props.segment}`)
      console.info(`value`, value)
      console.info(`Component`, Component)
      console.groupEnd()
    }

    // Build slot props for layouts with slots (@modal, @sidebar, etc.)
    const slotProps: Record<string, React.ReactNode> = {}
    if (value.slots && value.slots.size > 0) {
      for (const [slotName] of value.slots) {
        // Create a NamedSlot component for each slot
        // Pass layoutContextKey to scope slot state per-layout (prevents duplicate modals)
        slotProps[slotName] = (
          <NamedSlot name={slotName} layoutContextKey={value.contextKey} />
        )
      }
    }

    let rendered: React.ReactNode

    // Root layout with HTML support - use RootLayoutRenderer for proper HMR tracking
    if (props.segment === '') {
      rendered = (
        <RootLayoutRenderer
          LayoutComponent={Component}
          layoutProps={{ ...props, ...slotProps, ...loaderDataProps }}
          forwardedRef={ref}
        />
      )
    } else {
      rendered = (
        <RouteErrorBoundary routeName={value.route}>
          <Component {...props} {...slotProps} {...loaderDataProps} ref={ref} />
        </RouteErrorBoundary>
      )
    }

    if (value.type !== 'layout') {
      return rendered
    }

    const providedSuspenseFallback = LayoutSuspenseFallback ?? InheritedSuspenseFallback

    return (
      <SuspenseFallbackContext.Provider value={providedSuspenseFallback}>
        {LayoutSuspenseFallback
          ? wrapSuspense(rendered, LayoutSuspenseFallback)
          : rendered}
      </SuspenseFallbackContext.Provider>
    )
  })

  const wrapSuspense = (
    children: React.ReactNode,
    SuspenseFallback?: React.ComponentType<SuspenseFallbackProps>
  ) => {
    const fallback = (
      <RouteSuspenseFallback component={SuspenseFallback} route={value.contextKey} />
    )

    if (process.env.TAMAGUI_TARGET === 'native') {
      // native opt-out: set native.suspendRoutes to false in your one() config
      // OR set globalThis.__ONE_DISABLE_SUSPENSE_ROUTES__ = true at runtime
      // (the env var is used at the consuming app's build time, the runtime
      // flag is for environments like sootsim that need to disable it after
      // one has already been bundled).
      //
      // useful for JS-driven animations (e.g. sootsim canvas renderer) where
      // the rAF-driven stack push animation dominates the main thread and
      // React 18 defers the suspense subtree commit until rAF stops, which
      // means the new route content is null for the entire enter animation
      // (user sees only the drop shadow with no card content).
      if (
        process.env.ONE_SUSPEND_ROUTES_NATIVE === '0' ||
        (globalThis as any).__ONE_DISABLE_SUSPENSE_ROUTES__ === true
      ) {
        return children
      }
      return <Suspense fallback={fallback}>{children}</Suspense>
    }

    // web opt-in: set web.suspendRoutes to true in your one() config
    // off by default because suspense causes flickers on web during nav
    // since react navigation doesn't properly respect startTransition
    if (
      process.env.ONE_SUSPEND_ROUTES === '1' &&
      (globalThis as any).__ONE_DISABLE_SUSPENSE_ROUTES__ !== true
    ) {
      return <Suspense fallback={fallback}>{children}</Suspense>
    }
    return children
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
      const InheritedSuspenseFallback = useContext(SuspenseFallbackContext)

      return (
        <Route route={route} node={value}>
          <>
            {wrapSuspense(
              <ScreenComponent
                {...{
                  ...props,
                  ref,
                  // Expose the template segment path, e.g. `(home)`, `[foo]`, `index`
                  // the intention is to make it possible to deduce shared routes.
                  segment: value.route,
                }}
              />,
              InheritedSuspenseFallback
            )}
          </>
        </Route>
      )
    }
  )

  QualifiedRoute.displayName = `Route(${value.route})`

  qualifiedStore.set(value, QualifiedRoute)
  return memo(QualifiedRoute)
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

function routeToScreen(
  route: RouteNode,
  { options, ...props }: Partial<ScreenProps> = {}
) {
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
      // this doesn't work, also probably better to wrap suspense only on root layout in useScreens
      // but it doesnt seem to pick up our startTransitions which i wrapped in a few places.
      // now i thought this was due to our use of useSyncExternalStore, but i replaced that with
      // `use-sync-external-store/shim` and i also replaced the one in react-navigation that does
      // `use-sync-external-store/with-selector` to `use-sync-external-store/shim/with-selector`
      // but still it seems something else must be updating state outside a transition.

      // layout={({ children }) => {
      //   console.log('route.contextKey', route.contextKey)
      //   if (route.contextKey === '') {
      //     return <Suspense fallback={null}>{children}</Suspense>
      //   }
      //   return children
      // }}
      getComponent={() => {
        // log here to see which route is rendered
        // console.log('getting', route, getQualifiedRouteComponent(route))
        return getQualifiedRouteComponent(route)
      }}
    />
  )
}

type RouteErrorBoundaryState = {
  hasError: boolean
  error: any
  errorInfo: any
}

const ROUTE_ERROR_BOUNDARY_INITIAL_STATE = {
  hasError: false,
  error: null,
  errorInfo: null,
}

class RouteErrorBoundary extends React.Component<
  { children: React.ReactNode; routeName: string },
  RouteErrorBoundaryState
> {
  constructor(props) {
    super(props)
    this.state = ROUTE_ERROR_BOUNDARY_INITIAL_STATE
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error(
      `Error occurred while running route "${this.props.routeName}": ${
        error instanceof Error ? error.message : error
      }\n\n${error.stack}\n\nComponent Stack:\n${errorInfo.componentStack}`
    )
    this.setState({ errorInfo })

    // skew protection: chunk-load errors at the route level are unambiguous,
    // reload immediately. for any other render error, do a one-shot version
    // check and only reload if the deployed build actually changed. genuine
    // bugs fall through to the route error UI.
    if (
      process.env.TAMAGUI_TARGET !== 'native' &&
      process.env.NODE_ENV === 'production' &&
      process.env.ONE_SKEW_PROTECTION !== 'false'
    ) {
      if (isChunkLoadError(error)) {
        handleSkewError()
      } else {
        checkSkewAndReload()
      }
    }
  }

  clearError() {
    this.setState(ROUTE_ERROR_BOUNDARY_INITIAL_STATE)
  }

  render() {
    if (this.state.hasError) {
      const { error, errorInfo } = this.state
      return (
        <RouteErrorView
          routeName={this.props.routeName}
          error={error}
          errorInfo={errorInfo}
          onRetry={this.clearError.bind(this)}
        />
      )
    }

    return this.props.children
  }
}
