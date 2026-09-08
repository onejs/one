import type { getPathFromState as originalGetPathFromState } from '@react-navigation/core'
import { getPathDataFromState, type State } from '../fork/getPathFromState'
import { stripBaseUrl } from '../fork/getStateFromPath-mods'
import type { OneRouter } from '../interfaces/router'
import { getNormalizedStatePath, type UrlObject } from './getNormalizedStatePath'
import { isIndexPath } from './isIndexPath'
import { getResolvedLinking } from './linkingConfig'
import { stripPathSuffix } from './path'

export function getRouteInfo(state: OneRouter.ResultState) {
  return getRouteInfoFromState(
    (state: Parameters<typeof originalGetPathFromState>[0], asPath: boolean) => {
      return getPathDataFromState(state, {
        screens: [],
        ...getResolvedLinking()?.config,
        preserveDynamicRoutes: asPath,
        preserveGroups: asPath,
      })
    },
    state
  )
}

export function getRouteInfoFromState(
  getPathFromState: (state: State, asPath: boolean) => { path: string; params: any },
  state: State,
  baseUrl?: string
): UrlObject {
  const { path } = getPathFromState(state, false)
  const qualified = getPathFromState(state, true)

  return {
    unstable_globalHref: path,
    // a hash href serializes as /page#section; the pathname the router compares
    // against pending navigation and the URL must drop the hash as well as the query
    pathname: stripPathSuffix(stripBaseUrl(path, baseUrl)),
    isIndex: isIndexPath(state),
    ...getNormalizedStatePath(qualified, baseUrl),
  }
}
