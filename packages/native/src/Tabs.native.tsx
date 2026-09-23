import { useControlled } from './controlled'
import { Platform } from 'react-native'
import { assertSwiftUIValue } from './generated/swiftui'
import { dispatchSDKEvent, swiftStyleNative } from './generated/swiftStyleNative'
import { tabViewSlotAvailability } from './generated/viewSlots'
import { Children, isValidElement, useMemo, type ReactNode } from 'react'
import type {
  TabContentProps,
  TabProps,
  TabSectionProps,
  TabsProps,
  TabViewBottomAccessoryProps,
  TabViewSlotProps,
} from './types'
import NativeTab from './specs/OneNativeTabNativeComponent'
import NativeTabs from './specs/OneNativeTabsNativeComponent'

const PAGE_STYLE = {
  position: 'absolute',
  left: 0,
  top: 0,
  width: '100%',
  height: '100%',
} as const

export function TabViewBottomAccessory(_props: TabViewBottomAccessoryProps): never {
  throw new Error('Swift.TabViewBottomAccessory must be a direct child of Swift.Tabs')
}

export function TabViewSlot(_props: TabViewSlotProps): never {
  throw new Error('Swift.TabViewSlot must be a direct child of Swift.Tabs')
}

export function TabSection(_props: TabSectionProps): never {
  throw new Error('Swift.TabSection must be a direct child of Swift.Tabs')
}

export function Tab(_props: TabProps): never {
  throw new Error('Swift.Tab must be a direct child of Swift.Tabs or Swift.TabSection')
}

type Entry = {
  id: string
  kind: 'page' | 'action' | 'section' | 'accessoryInline' | 'accessoryExpanded' | 'slot'
  title: string
  systemImage: string
  badge: string
  role: string
  slotHeight: number
  tabModifiers: string
  testID?: string
  onPress?: () => void
  children: ReactNode
}

// validates the shared TabContent modifiers against the SDK and serializes them for the
// native TabContent application, dropping unset fields so an empty object means none.
function tabContentModifiers(
  owner: string,
  props: TabContentProps & {
    image?: string
    section?: string
    tabPlacement?: string
    defaultSectionExpansion?: string
    sectionActions?: TabSectionProps['sectionActions']
  },
  iosVersion: number
) {
  if (props.disabled !== undefined && iosVersion < 18.4)
    throw new Error(`${owner} disabled requires iOS 18.4 or later`)
  if (props.help !== undefined && iosVersion < 27)
    throw new Error(`${owner} help requires iOS 27 or later`)
  const placements = (value: { for?: readonly string[] } | undefined) => {
    const list = value?.for ?? []
    for (const placement of list)
      assertSwiftUIValue('AdaptableTabBarPlacement', placement, iosVersion)
    if (new Set(list).size !== list.length)
      throw new Error(`${owner} lists a placement twice`)
    return list
  }
  if (props.customizationBehavior)
    assertSwiftUIValue('TabCustomizationBehavior', props.customizationBehavior.behavior, iosVersion)
  if (props.defaultVisibility)
    assertSwiftUIValue('Visibility', props.defaultVisibility.visibility, iosVersion)
  if (props.springLoadingBehavior)
    assertSwiftUIValue('SpringLoadingBehavior', props.springLoadingBehavior, iosVersion)
  if (props.tabPlacement) assertSwiftUIValue('TabPlacement', props.tabPlacement, iosVersion)
  if (props.defaultSectionExpansion)
    assertSwiftUIValue('TabSectionExpansion', props.defaultSectionExpansion, iosVersion)
  return JSON.stringify({
    image: props.image,
    section: props.section,
    disabled: props.disabled,
    hidden: props.hidden,
    customizationID: props.customizationID,
    customizationBehavior: props.customizationBehavior && {
      value: props.customizationBehavior.behavior,
      placements: placements(props.customizationBehavior),
    },
    defaultVisibility: props.defaultVisibility && {
      value: props.defaultVisibility.visibility,
      placements: placements(props.defaultVisibility),
    },
    springLoadingBehavior: props.springLoadingBehavior,
    tabPlacement: props.tabPlacement,
    defaultSectionExpansion: props.defaultSectionExpansion,
    sectionActions: props.sectionActions?.map(({ id, title, systemImage }) => ({
      id,
      title,
      systemImage: systemImage ?? '',
    })),
    accessibilityLabel: props.accessibilityLabel,
    accessibilityHint: props.accessibilityHint,
    accessibilityValue: props.accessibilityValue,
    accessibilityIdentifier: props.accessibilityIdentifier,
    help: props.help,
  })
}

export function Tabs({
  children,
  selection,
  onSelectionChange,
  revision = 0,
  tabViewStyle = 'automatic',
  tabBarVisibility = 'automatic',
  customization = '',
  onCustomizationChange,
  swiftStyle,
  style,
  ...props
}: TabsProps) {
  const iosVersion = Number.parseFloat(String(Platform.Version))
  assertSwiftUIValue('TabViewStyle', tabViewStyle, iosVersion)
  assertSwiftUIValue('Visibility', tabBarVisibility, iosVersion)
  const controlled = useControlled<{
    selection: string
    eventCount: number
    revision: number
  }>((event) => onSelectionChange(event.selection), revision)
  const { entries, accessory, actions } = useMemo(() => {
    const ids = new Set<string>()
    const entries: Entry[] = []
    let accessory: TabViewBottomAccessoryProps | undefined
    const actions = new Map<string, () => void>()
    const claim = (owner: string, id: string) => {
      if (!id || ids.has(id)) throw new Error(`${owner} requires unique, nonempty ids: "${id}"`)
      ids.add(id)
    }
    const tab = (props: TabProps, section: string | undefined) => {
      const { id, title, systemImage, image, badge, role, testID, onPress, children: page } = props
      claim('Swift.Tab', id)
      if (Boolean(onPress) === (page !== undefined)) {
        throw new Error(
          `Swift.Tab "${id}" needs exactly one of onPress and children: a tab either runs an action or shows a page`
        )
      }
      if (systemImage && image) throw new Error(`Swift.Tab "${id}" takes systemImage or image, not both`)
      if (role) assertSwiftUIValue('TabRole', role, iosVersion)
      entries.push({
        id,
        kind: onPress ? 'action' : 'page',
        title,
        systemImage: systemImage ?? '',
        badge: badge === undefined ? '' : String(badge),
        role: role ?? '',
        slotHeight: 0,
        tabModifiers: tabContentModifiers(`Swift.Tab "${id}"`, { ...props, section }, iosVersion),
        testID,
        onPress,
        children: page,
      })
      if (onPress) actions.set(id, onPress)
    }
    for (const child of Children.toArray(children)) {
      if (!isValidElement(child)) throw new Error('Swift.Tabs children must be elements')
      if (child.type === Tab) {
        tab(child.props as TabProps, undefined)
      } else if (child.type === TabSection) {
        const section = child.props as TabSectionProps
        claim('Swift.TabSection', section.id)
        for (const action of section.sectionActions ?? []) {
          claim(`Swift.TabSection "${section.id}" sectionActions`, action.id)
          actions.set(action.id, action.onPress)
        }
        entries.push({
          id: section.id,
          kind: 'section',
          title: section.title,
          systemImage: '',
          badge: '',
          role: '',
          slotHeight: 0,
          tabModifiers: tabContentModifiers(`Swift.TabSection "${section.id}"`, section, iosVersion),
          children: undefined,
        })
        const tabs = Children.toArray(section.children)
        if (!tabs.length) throw new Error(`Swift.TabSection "${section.id}" needs Swift.Tab children`)
        for (const sectionChild of tabs) {
          if (!isValidElement(sectionChild) || sectionChild.type !== Tab)
            throw new Error(`Swift.TabSection "${section.id}" accepts Swift.Tab elements as children`)
          tab(sectionChild.props as TabProps, section.id)
        }
      } else if (child.type === TabViewBottomAccessory) {
        if (accessory) throw new Error('Swift.Tabs accepts one TabViewBottomAccessory')
        accessory = child.props as TabViewBottomAccessoryProps
      } else if (child.type === TabViewSlot) {
        const slot = child.props as TabViewSlotProps
        if (!Object.hasOwn(tabViewSlotAvailability, slot.name))
          throw new Error(`Swift.TabViewSlot has no SDK modifier ${slot.name}`)
        if (iosVersion < tabViewSlotAvailability[slot.name])
          throw new Error(`Swift.TabViewSlot ${slot.name} requires iOS ${tabViewSlotAvailability[slot.name]} or later`)
        if (!Number.isFinite(slot.height) || slot.height <= 0)
          throw new Error('Swift.TabViewSlot height must be a positive number')
        if (slot.children === undefined) throw new Error('Swift.TabViewSlot needs children')
        if (entries.some((entry) => entry.kind === 'slot' && entry.id === slot.name))
          throw new Error(`Swift.Tabs accepts one ${slot.name} slot`)
        entries.push({
          id: slot.name,
          kind: 'slot',
          title: '',
          systemImage: '',
          badge: '',
          role: '',
          slotHeight: slot.height,
          tabModifiers: '{}',
          children: slot.children,
        })
      } else {
        throw new Error(
          'Swift.Tabs accepts Swift.Tab, Swift.TabSection, Swift.TabViewSlot, and Swift.TabViewBottomAccessory elements as direct children'
        )
      }
    }
    return { entries, accessory, actions }
  }, [children, iosVersion])
  const tabsBeyondIOS17 = entries.some(
    (entry) => entry.kind === 'section' || (entry.kind !== 'slot' && entry.tabModifiers !== '{}')
  )
  if (iosVersion < 18 && (tabsBeyondIOS17 || tabViewStyle !== 'automatic' || onCustomizationChange))
    throw new Error('Swift.Tabs sections, tab modifiers, styles, and customization require iOS 18 or later')
  if (accessory) {
    if (entries.some((entry) => entry.kind === 'slot' && entry.id === 'tabViewBottomAccessory'))
      throw new Error('Swift.Tabs accepts one tabViewBottomAccessory slot')
    if (iosVersion < 26) throw new Error('Swift.TabViewBottomAccessory requires iOS 26 or later')
    if (accessory.isEnabled !== undefined && iosVersion < 26.1)
      throw new Error('Swift.TabViewBottomAccessory isEnabled requires iOS 26.1 or later')
    if (accessory.children === undefined && accessory.inline === undefined && accessory.expanded === undefined)
      throw new Error('Swift.TabViewBottomAccessory needs children, inline, or expanded content')
  }
  const selected = entries.find((entry) => entry.id === selection)
  if (!selected || (selected.kind !== 'page' && selected.kind !== 'action')) {
    throw new Error(`Swift.Tabs selection "${selection}" must identify a mounted Swift.Tab`)
  }
  if (selected.kind === 'action') {
    throw new Error(
      `Swift.Tabs selection "${selection}" is an action tab, which never becomes the selection`
    )
  }
  const accessoryEntries: Entry[] = accessory
    ? [
        { kind: 'accessoryInline' as const, content: accessory.inline ?? accessory.children ?? accessory.expanded },
        { kind: 'accessoryExpanded' as const, content: accessory.expanded ?? accessory.children ?? accessory.inline },
      ].map(({ kind, content }) => ({
        id: kind,
        kind,
        title: '',
        systemImage: '',
        badge: '',
        role: '',
        slotHeight: 0,
        tabModifiers: '{}',
        children: content,
      }))
    : []

  return (
    <NativeTabs
      {...props}
      style={[{ flex: 1 }, style]}
      swiftStyle={swiftStyleNative(swiftStyle)}
      onNativeSDKEvent={({ nativeEvent }) => dispatchSDKEvent(swiftStyle, nativeEvent.name, nativeEvent.value)}
      selection={selection}
      acknowledgedEvent={controlled.acknowledgedEvent}
      revision={revision}
      tabViewStyle={tabViewStyle}
      tabBarVisibility={tabBarVisibility}
      customization={customization}
      customizable={Boolean(onCustomizationChange)}
      bottomAccessoryEnabled={accessory?.isEnabled ?? true}
      onNativeTabsSelectionChange={({ nativeEvent }) =>
        controlled.onNativeChange(nativeEvent)
      }
      onNativeTabsAction={({ nativeEvent }) => actions.get(nativeEvent.tabId)?.()}
      onNativeTabsCustomizationChange={({ nativeEvent }) =>
        onCustomizationChange?.(nativeEvent.customization)
      }
    >
      {[...entries, ...accessoryEntries].map((entry) => {
        // only the selected page takes touches and accessibility; sections, slots and the
        // accessory are always live where SwiftUI shows them.
        const hidden = (entry.kind === 'page' || entry.kind === 'action') && entry.id !== selection
        return (
          <NativeTab
            key={`${entry.kind}:${entry.id}`}
            tabId={entry.id}
            kind={entry.kind}
            title={entry.title}
            systemImage={entry.systemImage}
            badge={entry.badge}
            tabRole={entry.role}
            slotHeight={entry.slotHeight}
            tabModifiers={entry.tabModifiers}
            testID={entry.testID}
            style={PAGE_STYLE}
            collapsable={false}
            pointerEvents={hidden ? 'none' : 'auto'}
            accessibilityElementsHidden={hidden}
            importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'}
          >
            {entry.children}
          </NativeTab>
        )
      })}
    </NativeTabs>
  )
}
