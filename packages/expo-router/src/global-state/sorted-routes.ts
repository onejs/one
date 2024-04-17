import type { RouterStore } from './router-store'
import { sortRoutes } from '../sortRoutes'

export function getSortedRoutes(this: RouterStore) {
  if (!this.routeNode) {
    throw new Error('No routes found')
  }

  return this.routeNode.children.filter((route) => !route.internal).sort(sortRoutes)
}
