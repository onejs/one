import type { NavigationState, PartialRoute } from '@react-navigation/core'
import { nanoid } from 'nanoid/non-secure'
import type { OneRouter } from '../../interfaces/router'
import { setLastAction } from '../lastAction'
import { matchDynamicName } from '../matchers'

/**
 * Generates a navigation action to transition from the current state to the desired state.
 */
export function getNavigateAction(
  /** desired state */
  actionState: OneRouter.ResultState,
  navigationState: NavigationState,
  type = 'NAVIGATE'
) {
  /**
   * We need to find the deepest navigator where the action and current state diverge, If they do not diverge, the
   * lowest navigator is the target.
   *
   * By default React Navigation will target the current navigator, but this doesn't work for all actions
   * For example:
   *  - /deeply/nested/route -> /top-level-route the target needs to be the top-level navigator
   *  - /stack/nestedStack/page -> /stack1/nestedStack/other-page needs to target the nestedStack navigator
   *
   * This matching needs to done by comparing the route names and the dynamic path, for example
   * - /1/page -> /2/anotherPage needs to target the /[id] navigator
   *
   * Other parameters such as search params and hash are not evaluated.
   *
   */
  let actionStateRoute: PartialRoute<any> | undefined

  // Traverse the state tree comparing the current state and the action state until we find where they diverge
  while (actionState && navigationState) {
    const stateRoute = navigationState.routes[navigationState.index]

    actionStateRoute = actionState.routes[actionState.routes.length - 1]

    const childState = actionStateRoute.state
    const nextNavigationState = stateRoute.state

    const dynamicMatch = matchDynamicName(actionStateRoute.name)

    const didActionAndCurrentStateDiverge =
      actionStateRoute.name !== stateRoute.name ||
      // !deepEqual(actionStateRoute.params, stateRoute.params) ||
      !childState ||
      !nextNavigationState ||
      (dynamicMatch &&
        actionStateRoute.params?.[dynamicMatch.name] !== stateRoute.params?.[dynamicMatch.name])

    if (didActionAndCurrentStateDiverge) {
      break
    }

    actionState = childState
    navigationState = nextNavigationState as NavigationState
  }

  /*
   * We found the target navigator, but the payload is in the incorrect format
   * We need to convert the action state to a payload that can be dispatched
   */
  const rootPayload: Record<string, any> = { params: {} }
  let payload = rootPayload
  let params = payload.params

  // The root level of payload is a bit weird, its params are in the child object
  while (actionStateRoute) {
    Object.assign(params, { ...actionStateRoute.params })
    payload.screen = actionStateRoute.name
    payload.params = { ...actionStateRoute.params }

    actionStateRoute = actionStateRoute.state?.routes[actionStateRoute.state?.routes.length - 1]

    payload.params ??= {}
    payload = payload.params
    params = payload
  }

  // One uses only three actions, but these don't directly translate to all navigator actions
  if (type === 'PUSH') {
    setLastAction()

    // Only stack navigators have a push action, and even then we want to use NAVIGATE (see below)
    type = 'NAVIGATE'

    /*
     * The StackAction.PUSH does not work correctly with One.
     *
     * One provides a getId() function for every route, altering how React Navigation handles stack routing.
     * Ordinarily, PUSH always adds a new screen to the stack. However, with getId() present, it navigates to the screen with the matching ID instead
     * (by moving the screen to the top of the stack)
     * When you try and push to a screen with the same ID, no navigation will occur
     * Refer to: https://github.com/react-navigation/react-navigation/blob/13d4aa270b301faf07960b4cd861ffc91e9b2c46/packages/routers/src/StackRouter.tsx#L279-L290
     *
     * One needs to retain the default behavior of PUSH, consistently adding new screens to the stack, even if their IDs are identical.
     *
     * To resolve this issue, we switch to using a NAVIGATE action with a new key. In the navigate action, screens are matched by either key or getId() function.
     * By generating a unique new key, we ensure that the screen is always pushed onto the stack.
     *
     */
    if (navigationState.type === 'stack') {
      rootPayload.key = `${rootPayload.name}-${nanoid()}` // @see https://github.com/react-navigation/react-navigation/blob/13d4aa270b301faf07960b4cd861ffc91e9b2c46/packages/routers/src/StackRouter.tsx#L406-L407
    }
  }

  if (type === 'REPLACE' && navigationState.type === 'tab') {
    type = 'JUMP_TO'
  }

  return {
    type,
    target: navigationState.key,
    payload: {
      key: rootPayload.key,
      name: rootPayload.screen,
      params: rootPayload.params,
    },
  }
}
