import type { ComponentProps, ReactElement } from 'react'

import { Link } from '../link/Link'
import {
  shouldHandleMouseEvent,
  useTabTrigger,
  type TabTriggerProps as SharedTabTriggerProps,
} from './useTabTrigger'

export type {
  SwitchToOptions,
  TabTriggerOptions,
  TabTriggerSlotProps,
  Trigger,
  TriggerProps,
  UseTabTriggerResult,
} from './useTabTrigger'
export { useTabTrigger } from './useTabTrigger'

export type TabTriggerProps = Omit<SharedTabTriggerProps, 'style'>

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
  const resolvedHref = trigger?.resolvedHref ?? href

  if (!resolvedHref) {
    return (
      <button type="button" onClick={(event) => triggerProps.onPress?.(event as any)}>
        {props.children}
      </button>
    )
  }

  return (
    <Link
      {...(props as any)}
      href={resolvedHref}
      asChild={asChild}
      onPress={(event) => {
        // modifier clicks stay browser-native (new tab / window), no tab switch
        if (!shouldHandleMouseEvent(event as any)) return
        event.preventDefault()
        triggerProps.onPress?.(event as any)
      }}
      onLongPress={triggerProps.onLongPress}
      aria-current={trigger?.isFocused ? 'page' : undefined}
      {...(asChild ? { isFocused: Boolean(trigger?.isFocused) } : null)}
    >
      {props.children}
    </Link>
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
