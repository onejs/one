import type { LinkingOptions, ParamListBase, PartialRoute, Route } from '@react-navigation/native'

import type { ExpoTabActionType } from './TabRouter'
import type { UrlObject } from '../router/getNormalizedStatePath'
import type { RouteNode } from '../router/Route'
import { resolveHref } from '../link/href'
import { sortRoutesWithInitial } from '../router/sortRoutes'
import type { OneRouter } from '../interfaces/router'
import { Slot } from './Slot'
import { Screen, createGetIdForRoute, getQualifiedRouteComponent } from '../router/useScreens'

export const ViewSlot = Slot

export type ScreenTrigger =
  | {
      type: 'internal'
      href: OneRouter.Href
      name: string
    }
  | {
      type: 'external'
      name: string
      href: string
    }

type JumpToNavigationAction = Extract<ExpoTabActionType, { type: 'JUMP_TO' }>
type TriggerConfig =
  | {
      type: 'internal'
      name: string
      href: string
      routeNode: RouteNode
      action: JumpToNavigationAction
    }
  | { type: 'external'; name: string; href: string }

export type TriggerMap = Record<string, TriggerConfig & { index: number }>

function resolveHrefWithSegments(
  href: string,
  routeInfo: UrlObject,
  segmentsWithoutGroups: string[]
): string {
  // For relative paths, resolve them relative to the current directory
  if (href.startsWith('./') || href.startsWith('../')) {
    const basePath = '/' + segmentsWithoutGroups.join('/')
    const baseDir = basePath.replace(/\/[^/]*$/, '') || '/'

    // Resolve the path
    const parts = (baseDir + '/' + href).split('/')
    const resolved: string[] = []

    for (const part of parts) {
      if (part === '.' || part === '') continue
      if (part === '..') {
        resolved.pop()
      } else {
        resolved.push(part)
      }
    }

    return '/' + resolved.join('/')
  }

  return href
}

export function triggersToScreens(
  triggers: ScreenTrigger[],
  layoutRouteNode: RouteNode,
  linking: LinkingOptions<ParamListBase>,
  initialRouteName: undefined | string,
  parentTriggerMap: TriggerMap,
  routeInfo: UrlObject,
  contextKey: string
) {
  const configs: TriggerConfig[] = []

  for (const trigger of triggers) {
    if (trigger.name in parentTriggerMap) {
      const parentTrigger = parentTriggerMap[trigger.name]
      throw new Error(
        `Trigger ${JSON.stringify({
          name: trigger.name,
          href: trigger.href,
        })} has the same name as parent trigger ${JSON.stringify({
          name: parentTrigger.name,
          href: parentTrigger.href,
        })}. Triggers must have unique names.`
      )
    }

    if (trigger.type === 'external') {
      configs.push(trigger)
      continue
    }

    let resolvedHref = resolveHref(trigger.href)

    if (resolvedHref.startsWith('../')) {
      throw new Error('Trigger href cannot link to a parent directory')
    }

    const segmentsWithoutGroups = contextKey.split('/').filter((segment) => {
      return !(segment.startsWith('(') && segment.endsWith(')'))
    })

    resolvedHref = resolveHrefWithSegments(resolvedHref, routeInfo, segmentsWithoutGroups)

    let state = linking.getStateFromPath?.(resolvedHref, linking.config)?.routes[0]

    if (!state) {
      // This shouldn't occur, as you should get the global +not-found
      console.warn(
        `Unable to find screen for trigger ${JSON.stringify(trigger)}. Does this point to a valid screen?`
      )
      continue
    }

    let routeState = state

    if (routeState.name === '+not-found') {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(
          `Tab trigger '${trigger.name}' has the href '${trigger.href}' which points to a +not-found route.`
        )
      }
      continue
    }

    const targetStateName = layoutRouteNode.route || '__root'

    // The state object is the current state from the rootNavigator
    // We need to work out the state for just this trigger
    while (state?.state) {
      if (state.name === targetStateName) break
      state = state.state.routes[state.state.index ?? state.state.routes.length - 1]
    }
    routeState = state.state?.routes[state.state.index ?? state.state.routes.length - 1] || state

    const routeNode = layoutRouteNode.children.find((child) => child.route === routeState?.name)

    if (!routeNode) {
      console.warn(
        `Unable to find routeNode for trigger ${JSON.stringify(trigger)}. This might be a bug in One router`
      )
      continue
    }

    const duplicateTrigger =
      trigger.type === 'internal' &&
      configs.find((config): config is Extract<TriggerConfig, { type: 'internal' }> => {
        if (config.type === 'external') {
          return false
        }

        return config.routeNode.route === routeNode.route
      })

    if (duplicateTrigger) {
      const duplicateTriggerText = `${JSON.stringify({ name: duplicateTrigger.name, href: duplicateTrigger.href })} and ${JSON.stringify({ name: trigger.name, href: trigger.href })}`

      throw new Error(
        `A navigator cannot contain multiple trigger components that map to the same sub-segment. Consider adding a shared group and assigning a group to each trigger. Conflicting triggers:\n\t${duplicateTriggerText}.\nBoth triggers map to route ${routeNode.route}.`
      )
    }

    configs.push({
      ...trigger,
      href: resolvedHref,
      routeNode,
      action: stateToAction(state, layoutRouteNode.route),
    })
  }

  const sortFn = sortRoutesWithInitial(initialRouteName)

  const sortedConfigs = configs.sort((a, b) => {
    // External routes should be last. They will eventually be dropped
    if (a.type === 'external' && b.type === 'external') {
      return 0
    } else if (a.type === 'external') {
      return 1
    } else if (b.type === 'external') {
      return -1
    }

    return sortFn(a.routeNode, b.routeNode)
  })

  const children: React.JSX.Element[] = []
  const triggerMap: TriggerMap = { ...parentTriggerMap }

  for (const [index, config] of sortedConfigs.entries()) {
    triggerMap[config.name] = { ...config, index }

    if (config.type === 'internal') {
      const route = config.routeNode
      children.push(
        <Screen
          getId={createGetIdForRoute(route)}
          name={route.route}
          key={route.route}
          options={(args) => {
            const staticOptions = route.generated ? route.loadRoute()?.getNavOptions : null
            const staticResult =
              typeof staticOptions === 'function' ? staticOptions(args) : staticOptions
            const output = {
              ...staticResult,
            }

            if (route.generated) {
              output.tabBarButton = () => null
              output.drawerItemStyle = { height: 0, display: 'none' }
            }

            return output
          }}
          getComponent={() => getQualifiedRouteComponent(route)}
        />
      )
    }
  }
  return {
    children,
    triggerMap,
  }
}

export function stateToAction(
  state: PartialRoute<Route<string, object | undefined>> | undefined,
  startAtRoute?: string
): JumpToNavigationAction {
  const rootPayload: any = {}
  let payload = rootPayload

  startAtRoute = startAtRoute === '' ? '__root' : startAtRoute

  let foundStartingPoint = startAtRoute === undefined || !state?.state

  while (state) {
    if (foundStartingPoint) {
      if (payload === rootPayload) {
        payload.name = state.name
      } else {
        payload.screen = state.name
      }
      payload.params = state.params ? { ...state.params } : {}

      state = state.state?.routes[state.state?.routes.length - 1]

      if (state) {
        payload.params ??= {}
        payload = payload.params
      }
    } else {
      if (state.name === startAtRoute) {
        foundStartingPoint = true
      }
      const nextState = state.state?.routes[state.state?.routes.length - 1]
      if (nextState) {
        state = nextState
      }
    }
  }

  return {
    type: 'JUMP_TO',
    payload: rootPayload,
  }
}
