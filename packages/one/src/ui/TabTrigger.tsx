import { Slot } from '@radix-ui/react-slot'
import type { TabNavigationState } from '@react-navigation/native'
import {
  type ComponentProps,
  type ReactElement,
  type ReactNode,
  use,
  useCallback,
} from 'react'
import {
  type GestureResponderEvent,
  Pressable,
  type PressableProps,
  StyleSheet,
  type View,
} from 'react-native'
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
  /**
   *  Name of tab. When used within a `TabList` this sets the name of the tab.
   * Otherwise, this references the name.
   */
  name: string
  /**
   * Name of tab. Required when used within a `TabList`.
   */
  href?: OneRouter.Href
  /**
   * Forward props to child component. Useful for custom wrappers.
   */
  asChild?: boolean
  /**
   * Resets the route when switching to a tab.
   */
  resetOnFocus?: boolean
}

export type TabTriggerOptions = {
  name: string
  href: OneRouter.Href
}

export type TabTriggerSlotProps = PressablePropsWithoutFunctionChildren &
  React.RefAttributes<View> & {
    isFocused?: boolean
    href?: string
  }

const TabTriggerSlot = Slot as React.ForwardRefExoticComponent<TabTriggerSlotProps>

/**
 * Helper function to determine if a mouse event should be handled
 */
function shouldHandleMouseEvent(
  e?: React.MouseEvent<HTMLAnchorElement, MouseEvent> | GestureResponderEvent
): boolean {
  if (!e) return true

  // Check if it's a MouseEvent
  if ('button' in e) {
    // Only handle left clicks without modifier keys
    return (
      !e.metaKey &&
      !e.altKey &&
      !e.ctrlKey &&
      !e.shiftKey &&
      (e.button == null || e.button === 0) &&
      [undefined, null, '', 'self'].includes((e.currentTarget as any).target)
    )
  }

  return true
}

/**
 * Creates a trigger to navigate to a tab. When used as child of `TabList`, its
 * functionality slightly changes since the `href` prop is required,
 * and the trigger also defines what routes are present in the `Tabs`.
 *
 * When used outside of `TabList`, this component no longer requires an `href`.
 *
 * @example
 * ```tsx
 * <Tabs>
 *  <TabSlot />
 *  <TabList>
 *   <TabTrigger name="home" href="/" />
 *  </TabList>
 * </Tabs>
 * ```
 */
export function TabTrigger({
  asChild,
  name,
  href,
  resetOnFocus,
  ...props
}: TabTriggerProps) {
  const { trigger, triggerProps } = useTabTrigger({
    name,
    resetOnFocus,
    ...props,
  })

  // Pressable doesn't accept the extra props, so only pass them if we are using asChild
  if (asChild) {
    return (
      <TabTriggerSlot
        style={styles.tabTrigger}
        {...props}
        {...triggerProps}
        href={trigger?.resolvedHref}
      >
        {props.children}
      </TabTriggerSlot>
    )
  } else {
    // These props are not typed, but are allowed by React Native Web
    const reactNativeWebProps = { href: trigger?.resolvedHref }

    return (
      <Pressable
        style={styles.tabTrigger}
        {...reactNativeWebProps}
        {...props}
        {...triggerProps}
      >
        {props.children}
      </Pressable>
    )
  }
}

/**
 * @hidden
 */
export function isTabTrigger(
  child: ReactElement<any>
): child is ReactElement<ComponentProps<typeof TabTrigger>> {
  return child.type === TabTrigger
}

/**
 * Options for `switchTab` function.
 */
export type SwitchToOptions = {
  /**
   * Navigate and reset the history on route focus.
   */
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

/**
 * Utility hook creating custom `TabTrigger`.
 */
export function useTabTrigger(options: TabTriggerProps): UseTabTriggerResult {
  const { state, navigation } = useNavigatorContext()
  const { name, resetOnFocus, onPress, onLongPress } = options
  const triggerMap = use(TabTriggerMapContext)

  const getTrigger = useCallback(
    (name: string) => {
      const config = triggerMap[name]

      if (!config) {
        return
      }

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
        } else {
          return navigation?.dispatch({
            ...config.action,
            type: 'JUMP_TO',
            payload: {
              ...config.action.payload,
              ...options,
            },
          })
        }
      } else {
        return navigation?.dispatch({
          type: 'JUMP_TO',
          payload: {
            name,
          },
        })
      }
    },
    [navigation, triggerMap]
  )

  const handleOnPress = useCallback<NonNullable<PressableProps['onPress']>>(
    (event) => {
      onPress?.(event)
      if (!trigger) return
      if (event?.isDefaultPrevented()) return

      navigation?.emit({
        type: 'tabPress',
        target: trigger.type === 'internal' ? trigger.route.key : trigger?.href,
        canPreventDefault: true,
      })

      if (!shouldHandleMouseEvent(event)) return

      switchTab(name, { resetOnFocus })
    },
    [onPress, name, resetOnFocus, trigger, navigation, switchTab]
  )

  const handleOnLongPress = useCallback<NonNullable<PressableProps['onLongPress']>>(
    (event) => {
      onLongPress?.(event)
      if (!trigger) return
      if (event?.isDefaultPrevented()) return

      navigation?.emit({
        type: 'tabLongPress',
        target: trigger.type === 'internal' ? trigger.route.key : trigger?.href,
      })

      if (!shouldHandleMouseEvent(event)) return

      switchTab(name, {
        resetOnFocus,
      })
    },
    [onLongPress, name, resetOnFocus, trigger, navigation, switchTab]
  )

  const triggerProps = {
    isFocused: Boolean(trigger?.isFocused),
    onPress: handleOnPress,
    onLongPress: handleOnLongPress,
  }

  return {
    switchTab,
    getTrigger,
    trigger,
    triggerProps,
  }
}

const styles = StyleSheet.create({
  tabTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
})
