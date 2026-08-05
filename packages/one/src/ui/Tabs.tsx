import { isValidElement, type ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'

import { ViewSlot } from './common'
import { useTabsWithChildren, type TabsProps } from './Tabs.shared'

export * from './TabContext'
export * from './TabList'
export * from './TabSlot'
export * from './TabTrigger'
export * from './Tabs.shared'

export function Tabs(props: TabsProps) {
  const { children, asChild, options, ...rest } = props
  const Comp = asChild ? ViewSlot : View

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
    <Comp style={styles.tabsRoot} {...rest}>
      <NavigationContent>{children}</NavigationContent>
    </Comp>
  )
}

const styles = StyleSheet.create({
  tabsRoot: {
    flex: 1,
  },
})
