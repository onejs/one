import { Tabs } from 'tamagui'

export const AlwaysVisibleTabContent = ({ active, setShow, ...props }: TabContentPaneProps) => {
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
