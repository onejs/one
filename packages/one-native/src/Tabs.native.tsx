import { Platform } from 'react-native'
import { assertSwiftUIValue } from './generated/swiftui'
import { Children, isValidElement, useMemo, useState } from 'react'
import type { TabProps, TabsProps } from './types'
import NativeTab from './specs/OneNativeTabNativeComponent'
import NativeTabs from './specs/OneNativeTabsNativeComponent'

const PAGE_STYLE = {
  position: 'absolute',
  left: 0,
  top: 0,
  width: '100%',
  height: '100%',
} as const

export function Tab(_props: TabProps): never {
  throw new Error('Swift.Tab must be a direct child of Swift.Tabs')
}

export function Tabs({
  children,
  selection,
  onSelectionChange,
  sidebarAdaptable = false,
  tabBarMinimizeBehavior,
  style,
  ...props
}: TabsProps) {
  const iosVersion = Number.parseFloat(String(Platform.Version))
  if (tabBarMinimizeBehavior)
    assertSwiftUIValue('TabBarMinimizeBehavior', tabBarMinimizeBehavior, iosVersion)
  const [acknowledgedEvent, setAcknowledgedEvent] = useState(0)
  const pages = useMemo(() => {
    const ids = new Set<string>()
    return Children.toArray(children).map((child) => {
      if (!isValidElement<TabProps>(child) || child.type !== Tab) {
        throw new Error('Swift.Tabs accepts Swift.Tab elements as direct children')
      }
      const { id, title, systemImage, badge, role, testID, children: page } = child.props
      if (!id || ids.has(id)) {
        throw new Error(`Swift.Tabs requires unique, nonempty tab ids: "${id}"`)
      }
      if (role) assertSwiftUIValue('TabRole', role, iosVersion)
      ids.add(id)
      return {
        id,
        title,
        systemImage: systemImage ?? '',
        badge: badge ?? '',
        role: role ?? '',
        testID,
        children: page,
      }
    })
  }, [children, iosVersion])
  if (!pages.some((page) => page.id === selection)) {
    throw new Error(
      `Swift.Tabs selection "${selection}" must identify a mounted Swift.Tab`
    )
  }

  return (
    <NativeTabs
      {...props}
      style={[{ flex: 1 }, style]}
      selection={selection}
      acknowledgedEvent={acknowledgedEvent}
      sidebarAdaptable={sidebarAdaptable}
      tabBarMinimizeBehavior={tabBarMinimizeBehavior ?? ''}
      onSelectionChange={({ nativeEvent }) => {
        try {
          onSelectionChange(nativeEvent.selection)
        } finally {
          setAcknowledgedEvent((prev) => Math.max(prev, nativeEvent.eventCount))
        }
      }}
    >
      {pages.map((page) => {
        const selected = page.id === selection
        return (
          <NativeTab
            key={page.id}
            tabId={page.id}
            title={page.title}
            systemImage={page.systemImage}
            badge={page.badge}
            tabRole={page.role}
            testID={page.testID}
            style={PAGE_STYLE}
            collapsable={false}
            pointerEvents={selected ? 'auto' : 'none'}
            accessibilityElementsHidden={!selected}
            importantForAccessibility={selected ? 'auto' : 'no-hide-descendants'}
          >
            {page.children}
          </NativeTab>
        )
      })}
    </NativeTabs>
  )
}
