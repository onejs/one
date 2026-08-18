import type { OneRouter } from '../interfaces/router'
import type { RouteNode } from './Route'

type PartialState = {
  index?: number
  routes: Array<{ name: string; state?: PartialState }>
}

// the same focus rule getPathFromState walks, so the predicate agrees with the
// pathname that state would serialize to
function focusedRouteOf(state: PartialState) {
  return typeof state.index === 'number'
    ? state.routes[state.index]
    : state.routes[state.routes.length - 1]
}

/**
 * True when `state` stops short of the route the URL names because the
 * navigator that owns the rest of it is not mounted.
 *
 * React Navigation rebuilds the container state from the navigators that are
 * mounted right now: `useOnGetState` asks each one for its state and a route
 * whose navigator is absent gets `state: undefined`. So a layout that renders
 * anything other than its `<Slot />` — an auth gate, a loading state, an access
 * check, a late mount during hydration — makes the container publish a state
 * that is a TRUNCATION of the real location. Serializing that gives a pathname
 * the app is not on: `/project/x/main` reads as `/`.
 *
 * The URL did not change, only the tree did, so nothing derived from the URL
 * may move. A consumer that acts on the truncated pathname and in turn decides
 * whether to render the routed subtree oscillates forever.
 */
export function isStateAwaitingNavigatorMount(
  state: OneRouter.ResultState | PartialState | undefined,
  rootNode: RouteNode | null
): boolean {
  if (!rootNode) return false

  let node = rootNode
  let current = state as PartialState | undefined

  while (current?.routes?.length) {
    const route = focusedRouteOf(current)
    if (!route) return false

    // direct children only: a directory with no `_layout` is flattened into the
    // parent navigator under a multi-segment route name, and that name is what
    // the state carries, so a recursive search would match the wrong depth
    const child = node.children.find((candidate) => candidate.route === route.name)
    if (!child) return false

    if (route.state) {
      node = child
      current = route.state
      continue
    }

    // deepest route this state carries. if the route tree says it still has
    // child routes to render, its navigator has not mounted yet
    return child.children.some((grandchild) => !grandchild.internal)
  }

  return false
}
