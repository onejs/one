import { MenuAction, ToolbarHost, ToolbarItem } from '@vxrn/native'

import { NAVIGATOR_CONFIG } from '../../headless/children'
import { PLATFORM } from '../../utils/platform'
import {
  TOOLBAR_KIND,
  slotChildrenToBottomData,
  type BottomToolbarItemData,
  type BottomToolbarMenuData,
  type StackToolbarBottomProps,
} from './stackToolbarDescriptors'

function BottomItemElement({ data }: { data: BottomToolbarItemData }) {
  return (
    <ToolbarItem
      identifier={data.identifier}
      title={data.title}
      systemImageName={data.systemImageName}
      tintColor={data.tintColor}
      disabled={data.disabled}
      hidden={data.hidden}
      selected={data.selected}
      accessibilityLabel={data.accessibilityLabel}
      accessibilityHint={data.accessibilityHint}
      onSelected={data.handler}
    />
  )
}

function BottomMenuChild({ data }: { data: BottomToolbarItemData | BottomToolbarMenuData }) {
  if (data.kind === 'menu') {
    return <BottomMenuElement data={data} />
  }
  return (
    <MenuAction
      identifier={data.identifier}
      title={data.title ?? data.accessibilityLabel ?? data.identifier}
      icon={data.systemImageName}
      disabled={data.disabled}
      destructive={data.destructive}
      hidden={data.hidden}
      isOn={data.selected}
      accessibilityLabel={data.accessibilityLabel}
      accessibilityHint={data.accessibilityHint}
      onSelected={data.handler}
    />
  )
}

function BottomMenuElement({ data }: { data: BottomToolbarMenuData }) {
  return (
    <MenuAction
      identifier={data.identifier}
      title={data.title}
      label={data.label ?? data.title}
      icon={data.icon}
      tintColor={data.tintColor}
      disabled={data.disabled}
      hidden={data.hidden}
      accessibilityLabel={data.accessibilityLabel}
      accessibilityHint={data.accessibilityHint}
    >
      {data.children.map((child) => (
        <BottomMenuChild key={child.identifier} data={child} />
      ))}
    </MenuAction>
  )
}

/**
 * In-screen bottom toolbar. Mount inside screen content so the toolbar host
 * sits under the screen view controller in the responder chain; the host
 * writes the controller toolbar items and drives animated visibility.
 * iOS only: there is no Android toolbar host, so this renders null elsewhere.
 */
export function StackToolbarBottom({ children, hidden, animated = true }: StackToolbarBottomProps) {
  // no Android toolbar host exists, so this is iOS only by contract.
  if (PLATFORM !== 'ios') return null
  const data = slotChildrenToBottomData(children)
  if (!data.length) return null
  return (
    <ToolbarHost hidden={hidden} animated={animated}>
      {data.map((entry) =>
        entry.kind === 'menu' ? (
          <BottomMenuElement key={entry.identifier} data={entry} />
        ) : (
          <BottomItemElement key={entry.identifier} data={entry} />
        )
      )}
    </ToolbarHost>
  )
}

Object.assign(StackToolbarBottom, { [NAVIGATOR_CONFIG]: true, [TOOLBAR_KIND]: 'bottom' })
