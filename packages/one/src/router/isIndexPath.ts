import type { State } from '../fork/getPathFromState'

type RouteLikeTree = {
  name: string
  state?: { index?: number; routes?: RouteLikeTree[] }
}

export function isIndexPath(state: State) {
  if (!state.routes) {
    return false
  }

  const route = getActualLastRoute(state.routes[state.index ?? state.routes.length - 1])

  if (route.state) {
    return isIndexPath(route.state)
  }

  if (route.name === 'index') {
    return true
  }

  if (route.params && 'screen' in route.params) {
    return route.params.screen === 'index'
  }

  if (route.name.match(/.+\/index$/)) {
    return true
  }

  return false
}

function getActualLastRoute<A extends RouteLikeTree>(routeLike: A): A {
  if (routeLike.name[0] === '(' && routeLike.state?.routes) {
    const routes = routeLike.state.routes
    return getActualLastRoute(routes[routeLike.state.index ?? routes.length - 1]) as any
  }
  return routeLike
}
