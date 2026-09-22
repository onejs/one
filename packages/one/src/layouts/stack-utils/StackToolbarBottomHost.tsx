import { MenuAction, ToolbarHost, ToolbarItem } from '@vxrn/native'
import type { ReactNode } from 'react'

import {
  toolbarChildrenToBottomData,
  type BottomToolbarButtonData,
  type BottomToolbarMenuActionData,
  type BottomToolbarMenuData,
  type BottomToolbarSpacerData,
  type BottomToolbarSearchBarSlotData,
  type BottomToolbarSubmenuData,
} from './stackToolbarDescriptors'

function BottomButtonElement({ data }: { data: BottomToolbarButtonData }) {
  return (
    <ToolbarItem
      identifier={data.identifier}
      title={data.title}
      systemImageName={data.systemImageName}
      xcassetName={data.xcassetName}
      image={data.image}
      imageRenderingMode={data.imageRenderingMode}
      tintColor={data.tintColor}
      barButtonItemStyle={data.barButtonItemStyle}
      sharesBackground={data.sharesBackground}
      hidesSharedBackground={data.hidesSharedBackground}
      hidden={data.hidden}
      selected={data.selected}
      disabled={data.disabled}
      badgeConfiguration={data.badgeConfiguration}
      titleStyle={data.titleStyle}
      accessibilityLabel={data.accessibilityLabel}
      accessibilityHint={data.accessibilityHint}
      onSelected={data.handler}
    />
  )
}

function BottomMenuActionElement({ data }: { data: BottomToolbarMenuActionData }) {
  return (
    <MenuAction
      identifier={data.identifier}
      title={data.title}
      icon={data.icon}
      xcassetName={data.xcassetName}
      image={data.image}
      imageRenderingMode={data.imageRenderingMode}
      disabled={data.disabled}
      destructive={data.destructive}
      hidden={data.hidden}
      isOn={data.isOn}
      keepPresented={data.keepPresented}
      discoverabilityLabel={data.discoverabilityLabel}
      subtitle={data.subtitle}
      accessibilityLabel={data.accessibilityLabel}
      accessibilityHint={data.accessibilityHint}
      onSelected={data.handler}
    />
  )
}

function BottomMenuChild({
  data,
}: {
  data: BottomToolbarMenuActionData | BottomToolbarSubmenuData
}) {
  if (data.kind === 'submenu') {
    return <BottomSubmenuElement data={data} />
  }
  return <BottomMenuActionElement data={data} />
}

function BottomSubmenuElement({ data }: { data: BottomToolbarSubmenuData }) {
  return (
    <MenuAction
      identifier={data.identifier}
      title={data.title}
      icon={data.icon}
      xcassetName={data.xcassetName}
      image={data.image}
      imageRenderingMode={data.imageRenderingMode}
      destructive={data.destructive}
      hidden={data.hidden}
      displayInline={data.inline}
      displayAsPalette={data.palette}
      accessibilityLabel={data.accessibilityLabel}
      accessibilityHint={data.accessibilityHint}
    >
      {data.children.map((child) => (
        <BottomMenuChild key={child.identifier} data={child} />
      ))}
    </MenuAction>
  )
}

function BottomMenuElement({ data }: { data: BottomToolbarMenuData }) {
  return (
    <MenuAction
      identifier={data.identifier}
      title={data.title}
      label={data.label}
      icon={data.systemImageName}
      xcassetName={data.xcassetName}
      image={data.image}
      imageRenderingMode={data.imageRenderingMode}
      tintColor={data.tintColor}
      barButtonItemStyle={data.barButtonItemStyle}
      sharesBackground={data.sharesBackground}
      hidesSharedBackground={data.hidesSharedBackground}
      disabled={data.disabled}
      destructive={data.destructive}
      hidden={data.hidden}
      displayInline={data.inline}
      displayAsPalette={data.palette}
      preferredElementSize={data.elementSize}
      accessibilityLabel={data.accessibilityLabel}
      accessibilityHint={data.accessibilityHint}
    >
      {data.children.map((child) => (
        <BottomMenuChild key={child.identifier} data={child} />
      ))}
    </MenuAction>
  )
}

function BottomSpacerElement({ data }: { data: BottomToolbarSpacerData }) {
  return (
    <ToolbarItem
      identifier={data.identifier}
      type={data.width === undefined ? 'fluidSpacer' : 'fixedSpacer'}
      width={data.width}
      sharesBackground={data.sharesBackground}
      hidden={data.hidden}
    />
  )
}

function BottomSearchBarSlotElement({ data }: { data: BottomToolbarSearchBarSlotData }) {
  return (
    <ToolbarItem
      identifier={data.identifier}
      type="searchBar"
      sharesBackground={data.sharesBackground}
      hidesSharedBackground={data.hidesSharedBackground}
      hidden={data.hidden}
    />
  )
}

export interface BottomToolbarHostProps {
  children?: ReactNode
  hidden?: boolean
  animated?: boolean
}

/**
 * In-screen bottom toolbar, rendered by Stack.Toolbar with bottom placement.
 * Mounts inside screen content so the host sits under the screen view
 * controller; the host writes the controller toolbar items. iOS only.
 */
export function BottomToolbarHost({
  children,
  hidden,
  animated = true,
}: BottomToolbarHostProps) {
  const data = toolbarChildrenToBottomData(children)
  if (!data.length) return null
  return (
    <ToolbarHost hidden={hidden} animated={animated}>
      {data.map((entry) => {
        switch (entry.kind) {
          case 'button':
            return <BottomButtonElement key={entry.identifier} data={entry} />
          case 'menu':
            return <BottomMenuElement key={entry.identifier} data={entry} />
          case 'spacer':
            return <BottomSpacerElement key={entry.identifier} data={entry} />
          case 'searchBar':
            return <BottomSearchBarSlotElement key={entry.identifier} data={entry} />
          default:
            // actions and submenus only occur nested inside menus.
            return null
        }
      })}
    </ToolbarHost>
  )
}
