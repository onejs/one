import { Tabs } from 'tamagui'
import type { TabContentPaneProps } from './types'

export const AlwaysVisibleTabContent = ({
  active,
  ...props
}: Omit<TabContentPaneProps, 'setShow'>) => {
  return (
    <Tabs.Content
      forceMount
      position="absolute"
      t={0}
      l={0}
      r={0}
      b={0}
      opacity={0}
      pointerEvents="none"
      {...(active === props.value && {
        opacity: 1,
        pe: 'auto',
      })}
      {...props}
    />
  )
}
