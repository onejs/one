import { isValidElement, type HTMLAttributes, type ReactNode } from 'react'

// runtime specifier must stay extensionless: the web build emits Slot.web.tsx as Slot.mjs
import { Slot as SlotImpl } from './Slot'
import type { Slot as WebSlot } from './Slot.web'

const Slot = SlotImpl as unknown as WebSlot
import { useTabsWithChildren, type TabsProps as SharedTabsProps } from './Tabs.shared'

export * from './TabContext'
export * from './TabList'
export * from './TabSlot'
export * from './TabTrigger'
export * from './Tabs.shared'

export type TabsProps = HTMLAttributes<HTMLDivElement> &
  Pick<SharedTabsProps, 'asChild' | 'options'>

export function Tabs(props: TabsProps) {
  const { children, asChild, options, ...rest } = props
  const Comp = asChild ? Slot : 'div'

  const { NavigationContent } = useTabsWithChildren({
    children:
      asChild &&
      isValidElement(children) &&
      children.props &&
      typeof children.props === 'object' &&
      'children' in children.props
        ? (children.props.children as ReactNode)
        : children,
    ...options,
  })

  return (
    <Comp {...rest}>
      <NavigationContent>{children}</NavigationContent>
    </Comp>
  )
}
