import { useControlled } from './controlled'
import { Platform } from 'react-native'
import { assertSwiftUIValue } from './generated/swiftui'
import { Children, isValidElement, useMemo } from 'react'
import type { TabProps, TabsProps, TabViewBottomAccessoryProps } from './types'
import NativeTab from './specs/OneNativeTabNativeComponent'
import NativeTabs from './specs/OneNativeTabsNativeComponent'

const PAGE_STYLE = {
  position: 'absolute',
  left: 0,
  top: 0,
  width: '100%',
  height: '100%',
} as const
const INLINE_ACCESSORY_ID = '__one_native_accessory_inline__'
const EXPANDED_ACCESSORY_ID = '__one_native_accessory_expanded__'

export function TabViewBottomAccessory(_props: TabViewBottomAccessoryProps): never {
  throw new Error('Swift.TabViewBottomAccessory must be a direct child of Swift.Tabs')
}

export function Tab(_props: TabProps): never {
  throw new Error('Swift.Tab must be a direct child of Swift.Tabs')
}

export function Tabs({
  children,
  selection,
  onSelectionChange,
  revision = 0,
  sidebarAdaptable = false,
  tabBarMinimizeBehavior,
  style,
  ...props
}: TabsProps) {
  const iosVersion = Number.parseFloat(String(Platform.Version))
  if (tabBarMinimizeBehavior)
    assertSwiftUIValue('TabBarMinimizeBehavior', tabBarMinimizeBehavior, iosVersion)
  const controlled = useControlled<{
    selection: string
    eventCount: number
    revision: number
  }>((event) => onSelectionChange(event.selection), revision)
  const { pages, accessory } = useMemo(() => {
    const ids = new Set<string>()
    let accessory: TabViewBottomAccessoryProps | undefined
    const pages = Children.toArray(children).flatMap((child) => {
      if (isValidElement<TabViewBottomAccessoryProps>(child) && child.type === TabViewBottomAccessory) {
        if (accessory) throw new Error('Swift.Tabs accepts one TabViewBottomAccessory')
        accessory = child.props
        return []
      }
      if (!isValidElement<TabProps>(child) || child.type !== Tab) {
        throw new Error('Swift.Tabs accepts Swift.Tab and Swift.TabViewBottomAccessory elements as direct children')
      }
      const {
        id,
        title,
        systemImage,
        badge,
        role,
        testID,
        onPress,
        children: page,
      } = child.props
      if (!id || id === INLINE_ACCESSORY_ID || id === EXPANDED_ACCESSORY_ID || ids.has(id)) {
        throw new Error(`Swift.Tabs requires unique, nonempty tab ids: "${id}"`)
      }
      if (Boolean(onPress) === (page !== undefined)) {
        throw new Error(
          `Swift.Tab "${id}" needs exactly one of onPress and children: a tab either runs an action or shows a page`
        )
      }
      if (role) assertSwiftUIValue('TabRole', role, iosVersion)
      ids.add(id)
      return [{
        id,
        title,
        systemImage: systemImage ?? '',
        badge: badge ?? '',
        role: role ?? '',
        testID,
        onPress,
        children: page,
      }]
    })
    return { pages, accessory }
  }, [children, iosVersion])
  if (accessory && iosVersion < 26)
    throw new Error('Swift.TabViewBottomAccessory requires iOS 26 or later')
  if (accessory && accessory.children === undefined && accessory.inline === undefined && accessory.expanded === undefined)
    throw new Error('Swift.TabViewBottomAccessory needs children, inline, or expanded content')
  const selected = pages.find((page) => page.id === selection)
  if (!selected) {
    throw new Error(
      `Swift.Tabs selection "${selection}" must identify a mounted Swift.Tab`
    )
  }
  if (selected.onPress) {
    throw new Error(
      `Swift.Tabs selection "${selection}" is an action tab, which never becomes the selection`
    )
  }

  return (
    <NativeTabs
      {...props}
      style={[{ flex: 1 }, style]}
      selection={selection}
      acknowledgedEvent={controlled.acknowledgedEvent}
      revision={revision}
      sidebarAdaptable={sidebarAdaptable}
      tabBarMinimizeBehavior={tabBarMinimizeBehavior ?? ''}
      onNativeTabsSelectionChange={({ nativeEvent }) =>
        controlled.onNativeChange(nativeEvent)
      }
      onNativeTabsAction={({ nativeEvent }) =>
        pages.find((page) => page.id === nativeEvent.tabId)?.onPress?.()
      }
    >
      {pages.map((page) => {
        const visible = page.id === selection
        return (
          <NativeTab
            key={page.id}
            tabId={page.id}
            title={page.title}
            systemImage={page.systemImage}
            badge={page.badge}
            tabRole={page.role}
            action={Boolean(page.onPress)}
            testID={page.testID}
            style={PAGE_STYLE}
            collapsable={false}
            pointerEvents={visible ? 'auto' : 'none'}
            accessibilityElementsHidden={!visible}
            importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}
          >
            {page.children}
          </NativeTab>
        )
      })}
      {accessory && [
        { id: INLINE_ACCESSORY_ID, content: accessory.inline ?? accessory.children ?? accessory.expanded },
        { id: EXPANDED_ACCESSORY_ID, content: accessory.expanded ?? accessory.children ?? accessory.inline },
      ].map(({ id, content }) => (
        <NativeTab
          key={id}
          tabId={id}
          title=""
          systemImage=""
          badge=""
          tabRole=""
          action={false}
          style={PAGE_STYLE}
          collapsable={false}
        >
          {content}
        </NativeTab>
      ))}
    </NativeTabs>
  )
}
