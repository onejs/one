import type { ComponentProps, HTMLAttributes, ReactElement } from 'react'

// runtime specifier must stay extensionless: the web build emits Slot.web.tsx as Slot.mjs
import { Slot as SlotImpl } from './Slot'
import type { Slot as WebSlot } from './Slot.web'

const Slot = SlotImpl as unknown as WebSlot

export type TabListProps = HTMLAttributes<HTMLElement> & {
  /** Forward props to child component and removes the extra `<nav>`. Useful for custom wrappers. */
  asChild?: boolean
}

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
