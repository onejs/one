import type { TabNavigationState } from '@react-navigation/native'
import {
  use,
  useCallback,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type RefAttributes,
} from 'react'
import type { GestureResponderEvent, PressableProps, View } from 'react-native'

import { appendBaseUrl } from '../fork/getPathFromState-mods'
import type { OneRouter } from '../interfaces/router'
import { router } from '../router/imperative-api'
import { stripGroupSegmentsFromPath } from '../router/matchers'
import { useNavigatorContext } from '../views/Navigator'
import type { TriggerMap } from './common'
import { TabTriggerMapContext } from './TabContext'

type PressablePropsWithoutFunctionChildren = Omit<PressableProps, 'children'> & {
  children?: ReactNode | undefined
}

export type TabTriggerProps = PressablePropsWithoutFunctionChildren & {
  /** Name of the tab. */
  name: string
  /** Link used when defining the trigger within a `TabList`. */
  href?: OneRouter.Href
  /** Forward props to the child component. */
  asChild?: boolean
  /** Reset the route when switching to the tab. */
  resetOnFocus?: boolean
}

export type TabTriggerOptions = {
  name: string
  href: OneRouter.Href
}

export type TabTriggerSlotProps = PressablePropsWithoutFunctionChildren &
  RefAttributes<View> & {
    isFocused?: boolean
    href?: string
  }

export type SwitchToOptions = {
  resetOnFocus?: boolean
}

export type Trigger = TriggerMap[string] & {
  isFocused: boolean
  resolvedHref: string
  route: TabNavigationState<any>['routes'][number]
}

export type UseTabTriggerResult = {
  switchTab: (name: string, options: SwitchToOptions) => void
  getTrigger: (name: string) => Trigger | undefined
  trigger?: Trigger
  triggerProps: TriggerProps
}

export type TriggerProps = {
  isFocused: boolean
  onPress: PressableProps['onPress']
  onLongPress: PressableProps['onLongPress']
}

export function shouldHandleMouseEvent(
  event?: ReactMouseEvent<HTMLAnchorElement, MouseEvent> | GestureResponderEvent
): boolean {
  if (!event) return true

  if ('button' in event) {
    return (
      !event.metaKey &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.shiftKey &&
      (event.button == null || event.button === 0) &&
      [undefined, null, '', 'self'].includes((event.currentTarget as any).target)
    )
  }

  return true
}

export function useTabTrigger(options: TabTriggerProps): UseTabTriggerResult {
  const { state, navigation } = useNavigatorContext()
  const { name, resetOnFocus, onPress, onLongPress } = options
  const triggerMap = use(TabTriggerMapContext)

  const getTrigger = useCallback(
    (name: string) => {
      const config = triggerMap[name]

      if (!config) return

      return {
        isFocused: state.index === config.index,
        route: state.routes[config.index],
        resolvedHref: stripGroupSegmentsFromPath(appendBaseUrl(config.href)),
        ...config,
      }
    },
    [triggerMap, state]
  )

  const trigger = name !== undefined ? getTrigger(name) : undefined

  const switchTab = useCallback(
    (name: string, options?: SwitchToOptions) => {
      const config = triggerMap[name]

      if (config) {
        if (config.type === 'external') {
          return router.navigate(config.href)
        }

        return navigation?.dispatch({
          ...config.action,
          type: 'JUMP_TO',
          payload: {
            ...config.action.payload,
            ...options,
          },
        })
      }

      return navigation?.dispatch({
        type: 'JUMP_TO',
        payload: { name },
      })
    },
    [navigation, triggerMap]
  )

  const handleOnPress = useCallback<NonNullable<PressableProps['onPress']>>(
    (event) => {
      onPress?.(event)
      if (!trigger || event?.isDefaultPrevented()) return

      navigation?.emit({
        type: 'tabPress',
        target: trigger.type === 'internal' ? trigger.route.key : trigger.href,
        canPreventDefault: true,
      })

      if (!shouldHandleMouseEvent(event) || trigger.isFocused) return

      switchTab(name, { resetOnFocus })
    },
    [onPress, name, resetOnFocus, trigger, navigation, switchTab]
  )

  const handleOnLongPress = useCallback<NonNullable<PressableProps['onLongPress']>>(
    (event) => {
      onLongPress?.(event)
      if (!trigger || event?.isDefaultPrevented()) return

      navigation?.emit({
        type: 'tabLongPress',
        target: trigger.type === 'internal' ? trigger.route.key : trigger.href,
      })

      if (!shouldHandleMouseEvent(event)) return

      switchTab(name, { resetOnFocus })
    },
    [onLongPress, name, resetOnFocus, trigger, navigation, switchTab]
  )

  return {
    switchTab,
    getTrigger,
    trigger,
    triggerProps: {
      isFocused: Boolean(trigger?.isFocused),
      onPress: handleOnPress,
      onLongPress: handleOnLongPress,
    },
  }
}
