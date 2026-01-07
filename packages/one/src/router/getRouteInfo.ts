import type { getPathFromState as originalGetPathFromState } from "@react-navigation/core";
import { getPathDataFromState, type State } from "../fork/getPathFromState";
import { stripBaseUrl } from "../fork/getStateFromPath-mods";
import type { OneRouter } from "../interfaces/router";
import { getNormalizedStatePath, type UrlObject } from "./getNormalizedStatePath";
import { isIndexPath } from "./isIndexPath";
import { getLinking } from "./linkingConfig";

export function getRouteInfo(state: OneRouter.ResultState) {
  return getRouteInfoFromState(
    (state: Parameters<typeof originalGetPathFromState>[0], asPath: boolean) => {
      return getPathDataFromState(state, {
        screens: [],
        ...getLinking()?.config,
        preserveDynamicRoutes: asPath,
        preserveGroups: asPath,
      });
    },
    state,
  );
}

function getRouteInfoFromState(
  getPathFromState: (state: State, asPath: boolean) => { path: string; params: any },
  state: State,
  baseUrl?: string,
): UrlObject {
  const { path } = getPathFromState(state, false);
  const qualified = getPathFromState(state, true);

  return {
    unstable_globalHref: path,
    pathname: stripBaseUrl(path, baseUrl).split("?")[0],
    isIndex: isIndexPath(state),
    ...getNormalizedStatePath(qualified, baseUrl),
  };
}
