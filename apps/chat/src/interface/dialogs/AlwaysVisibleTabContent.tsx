import { Tabs } from 'tamagui'
import type { TabContentPaneProps } from './types'

export const AlwaysVisibleTabContent = ({
  active,
  ...props
}: Omit<TabContentPaneProps, 'setShow'>) => {
  return (
    <Tabs.Content
      forceMount
      pos="absolute"
      t={0}
      l={0}
      r={0}
      b={0}
      o={0}
      pe="none"
      {...(active === props.value && {
        o: 1,
        pe: 'auto',
      })}
      {...props}
    />
  )
}
