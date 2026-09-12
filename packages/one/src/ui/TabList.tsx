import type { ComponentProps, HTMLAttributes, ReactElement } from 'react'

import { Slot } from './Slot'

export type TabListProps = HTMLAttributes<HTMLElement> & {
  /** Forward props to child component and removes the extra `<nav>`. Useful for custom wrappers. */
  asChild?: boolean
}

/**
 * Wrapper component for `TabTriggers`. `TabTriggers` within the `TabList` define the tabs.
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
export function TabList({ asChild, ...props }: TabListProps) {
  const Comp = asChild ? Slot : 'nav'
  return <Comp {...props} />
}

/**
 * @hidden
 */
export function isTabList(
  child: ReactElement<any>
): child is ReactElement<ComponentProps<typeof TabList>> {
  return child.type === TabList
}
