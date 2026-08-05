import { Slot } from '@radix-ui/react-slot'
import type { ComponentProps, ForwardRefExoticComponent, ReactElement } from 'react'
import { Pressable, StyleSheet } from 'react-native'

import {
  useTabTrigger,
  type TabTriggerProps,
  type TabTriggerSlotProps,
} from './useTabTrigger'

export type {
  SwitchToOptions,
  TabTriggerOptions,
  TabTriggerProps,
  TabTriggerSlotProps,
  Trigger,
  TriggerProps,
  UseTabTriggerResult,
} from './useTabTrigger'
export { useTabTrigger } from './useTabTrigger'

const TabTriggerSlot = Slot as ForwardRefExoticComponent<TabTriggerSlotProps>

/**
 * Creates a trigger to navigate to a tab. When used as child of `TabList`, its
 * functionality slightly changes since the `href` prop is required,
 * and the trigger also defines what routes are present in the `Tabs`.
 *
 * When used outside of `TabList`, this component no longer requires an `href`.
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
  }

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

/**
 * @hidden
 */
export function isTabTrigger(
  child: ReactElement<any>
): child is ReactElement<ComponentProps<typeof TabTrigger>> {
  return child.type === TabTrigger
}

const styles = StyleSheet.create({
  tabTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
})
