import type { NavigationState } from '@react-navigation/core'
import { StackActions } from '@react-navigation/native'
import type { OneRouter } from '../../interfaces/router'
import { matchDynamicName, matchGroupName } from '../matchers'
import { getNavigateAction } from './getNavigateAction'

export function getNativeStackReplaceAction(
  actionState: OneRouter.ResultState,
  navigationState: NavigationState
) {
  while (actionState && navigationState) {
    const currentRoute = navigationState.routes[navigationState.index]
    const targetRoute =
      actionState.routes[actionState.index ?? actionState.routes.length - 1]

    if (
      currentRoute.name !== targetRoute.name &&
      (matchGroupName(currentRoute.name) || matchGroupName(targetRoute.name))
    ) {
      return null
    }

    const dynamicMatch = matchDynamicName(targetRoute.name)
    const changesDynamicScreen =
      currentRoute.name === targetRoute.name &&
      dynamicMatch &&
      currentRoute.params?.[dynamicMatch.name] !== targetRoute.params?.[dynamicMatch.name]

    // a new dynamic screen instance can own a nested navigator of its own.
    if (!currentRoute.state || !targetRoute.state || changesDynamicScreen) {
      if (
        (currentRoute.name !== targetRoute.name || changesDynamicScreen) &&
        navigationState.type === 'stack' &&
        navigationState.routeNames.includes(targetRoute.name)
      ) {
        const { payload } = getNavigateAction(actionState, navigationState, 'REPLACE')
        return {
          ...StackActions.replace(payload.name, payload.params),
          target: navigationState.key,
          source: currentRoute.key,
        }
      }
      return null
    }

    if (currentRoute.name !== targetRoute.name) {
      return null
    }

    actionState = targetRoute.state as OneRouter.ResultState
    navigationState = currentRoute.state as NavigationState
  }

  return null
}
