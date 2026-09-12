import { getContextKey, matchDynamicName } from './router/matchers'
import type { RouteNode } from './router/Route'

const layoutRouteNamePrefix = '__one_layout:'

export type Screen =
  | string
  | {
      path: string
      screens: Record<string, Screen>
      _route?: RouteNode
      initialRouteName?: string
    }

// `[page]` -> `:page`
// `page` -> `page`
function convertDynamicRouteToReactNavigation(segment: string): string {
  // NOTE: To support shared routes we preserve group segments.
  if (segment === 'index') {
    return ''
  }

  if (segment === '+not-found') {
    return '*not-found'
  }

  const dynamicMatch = matchDynamicName(segment)
  if (dynamicMatch) {
    if (dynamicMatch.deep) {
      return '*' + dynamicMatch.name
    }
    return `:${dynamicMatch.name}`
  }

  return segment
}

function parseRouteSegments(segments: string): string {
  return (
    // NOTE: When there are nested routes without layouts
    // the node.route will be something like `app/home/index`
    // this needs to be split to ensure each segment is parsed correctly.
    segments
      .split('/')
      // Convert each segment to a React Navigation format.
      .map(convertDynamicRouteToReactNavigation)
      // Remove any empty paths from groups or index routes.
      .filter(Boolean)
      // Join to return as a path.
      .join('/')
  )
}

function hasDescendantWithRoute(node: RouteNode, route: string): boolean {
  return node.children.some(
    (child) => child.route === route || hasDescendantWithRoute(child, route)
  )
}

export function getReactNavigationRouteName(node: RouteNode): string {
  if (node.children.length && hasDescendantWithRoute(node, node.route)) {
    return `${layoutRouteNamePrefix}${node.contextKey}`
  }
  return node.route
}

type PartialNavigationState = {
  index?: number
  routes: Array<{ name: string; state?: PartialNavigationState }>
}

function focusedRoute(state: PartialNavigationState) {
  return state.routes[state.index ?? state.routes.length - 1]
}

export function resolveInitialRouteNameFromState(
  contextKey: string,
  state: PartialNavigationState | undefined
): string | undefined {
  const contextSegments = contextKey.split('/').filter(Boolean)
  let current = state
  let consumedSegments = 0

  while (consumedSegments < contextSegments.length) {
    if (!current?.routes.length) return undefined
    const route = focusedRoute(current)
    if (!route?.state) return undefined

    if (route.name.startsWith(layoutRouteNamePrefix)) {
      const routeContextSegments = getContextKey(
        route.name.slice(layoutRouteNamePrefix.length)
      )
        .split('/')
        .filter(Boolean)

      if (
        routeContextSegments.length <= consumedSegments ||
        routeContextSegments.join('/') !==
          contextSegments.slice(0, routeContextSegments.length).join('/')
      ) {
        return undefined
      }
      consumedSegments = routeContextSegments.length
    } else {
      const routeSegments = route.name.split('/').filter(Boolean)
      if (
        route.name !==
        contextSegments
          .slice(consumedSegments, consumedSegments + routeSegments.length)
          .join('/')
      ) {
        return undefined
      }
      consumedSegments += routeSegments.length
    }

    current = route.state
  }

  return current?.routes.length ? focusedRoute(current)?.name : undefined
}

function getReactNavigationInitialRouteName(
  nodes: RouteNode[],
  initialRouteName: string | undefined
): string | undefined {
  if (!initialRouteName) return undefined
  const initialRoute = nodes.find((node) => node.route === initialRouteName)
  return initialRoute ? getReactNavigationRouteName(initialRoute) : initialRouteName
}

function convertRouteNodeToScreen(node: RouteNode, metaOnly: boolean): Screen {
  const path = parseRouteSegments(node.route)

  if (!node.children.length) {
    if (!metaOnly) {
      return {
        path,
        screens: {},
        _route: node,
      }
    }
    return path
  }

  const screens = getReactNavigationScreensConfig(node.children, metaOnly)

  const screen: Screen = {
    path,
    screens,
    // NOTE: This is bad because it forces all Layout Routes
    // to be loaded into memory. We should move towards a system where
    // the initial route name is either loaded asynchronously in the Layout Route
    // or defined via a file system convention.
    initialRouteName: getReactNavigationInitialRouteName(
      node.children,
      node.initialRouteName
    ),
  }

  if (!metaOnly) {
    screen._route = node
  }

  return screen
}

function getReactNavigationScreensConfig(
  nodes: RouteNode[],
  metaOnly: boolean
): Record<string, Screen> {
  return Object.fromEntries(
    nodes.map(
      (node) =>
        [
          getReactNavigationRouteName(node),
          convertRouteNodeToScreen(node, metaOnly),
        ] as const
    )
  )
}

export function getReactNavigationConfig(
  routes: RouteNode,
  metaOnly: boolean
): {
  initialRouteName?: string
  screens: Record<string, Screen>
} {
  if (!routes) {
    return { screens: {} }
  }
  return {
    initialRouteName: getReactNavigationInitialRouteName(
      routes.children,
      routes.initialRouteName
    ),
    screens: getReactNavigationScreensConfig(routes.children, metaOnly),
  }
}
