import { One } from 'one'
import React from 'react'
import { Platform } from 'react-native'
import type { NativeMenuAdapter, NativeMenuModule } from '@tamagui/native'
import type { ComponentProps, ComponentType, ReactElement, ReactNode } from 'react'

type MenuItems = ComponentProps<typeof One.iOS.Menu>['items']
type MenuItem = MenuItems[number]

type MarkerProps = {
  children?: ReactNode
  [key: string]: unknown
}

function marker(name: string): ComponentType<MarkerProps> {
  const Marker = () => null
  Marker.displayName = `OneMenu${name}`
  return Marker
}

const warnedUnsupported = new Set<string>()

// dropping an embellishment warns once in dev, mirroring the expo adapter this
// replaces. throwing took down the whole app for an optional decoration.
function warnUnsupported(feature: string) {
  if (warnedUnsupported.has(feature) || process.env.NODE_ENV === 'production') {
    return
  }
  warnedUnsupported.add(feature)
  console.warn(`[one] One Menu does not support ${feature}, so it will not render.`)
}

function isMarkerType(candidate: unknown, type: ComponentType<MarkerProps>): boolean {
  if (candidate === type) return true
  const wanted = (type as { displayName?: string }).displayName
  if (!wanted) return false
  return (
    typeof candidate === 'function' &&
    (candidate as { displayName?: string }).displayName === wanted
  )
}

function elementOfType(
  children: ReactNode,
  type: ComponentType<MarkerProps>,
): ReactElement<MarkerProps> | null {
  for (const child of React.Children.toArray(children)) {
    if (React.isValidElement<MarkerProps>(child) && isMarkerType(child.type, type)) {
      return child
    }
  }
  return null
}

function textFromNode(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (!React.isValidElement<MarkerProps>(node)) return ''
  return React.Children.toArray(node.props.children).map(textFromNode).join('')
}

// per-menu parse state. module scope would leak ids and handlers across every
// menu on the screen, so Root creates one per render and threads it through.
type ParseState = {
  nextId: number
  seenIds: Set<string>
  handlers: Map<string, (value?: boolean) => void>
}

export function createOneMenuAdapter(): NativeMenuAdapter {
  function createModule(isContextMenu: boolean): NativeMenuModule {
    const Trigger = marker('Trigger')
    const Content = marker('Content')
    const Item = marker('Item')
    const ItemTitle = marker('ItemTitle')
    const ItemSubtitle = marker('ItemSubtitle')
    const ItemIcon = marker('ItemIcon')
    const ItemImage = marker('ItemImage')
    const ItemIndicator = marker('ItemIndicator')
    const Group = marker('Group')
    const Label = marker('Label')
    const Separator = marker('Separator')
    const Sub = marker('Sub')
    const SubTrigger = marker('SubTrigger')
    const SubContent = marker('SubContent')
    const CheckboxItem = marker('CheckboxItem')
    const Preview = marker('Preview')
    const Auxiliary = marker('Auxiliary')

    function actionId(state: ParseState, element: ReactElement<MarkerProps>): string {
      const rawKey = element.key != null ? element.key.replace(/^\.\$/, '') : ''
      let candidate =
        rawKey && rawKey !== 'null' && rawKey !== 'undefined'
          ? rawKey
          : `one-menu-${state.nextId++}`
      while (state.seenIds.has(candidate)) {
        candidate = `${candidate}-${state.nextId++}`
      }
      state.seenIds.add(candidate)
      return candidate
    }

    function itemTitle(element: ReactElement<MarkerProps>): string {
      if (typeof element.props.textValue === 'string') return element.props.textValue
      const title = elementOfType(element.props.children, ItemTitle)
      return title ? textFromNode(title.props.children) : ''
    }

    // One items carry an SF Symbol name, never a bitmap, so a source image has
    // no honest mapping and is dropped where the expo adapter passed it through.
    function actionImage(element: ReactElement<MarkerProps>): string {
      const image = elementOfType(element.props.children, ItemImage)
      if (image) warnUnsupported('menu item images')
      const icon = elementOfType(element.props.children, ItemIcon)
      if (!icon) return ''
      const ios = icon.props.ios
      if (
        typeof ios === 'object' &&
        ios &&
        'name' in ios &&
        typeof ios.name === 'string'
      ) {
        return ios.name
      }
      return typeof icon.props.iosIconName === 'string' ? icon.props.iosIconName : ''
    }

    function itemHelp(element: ReactElement<MarkerProps>): string {
      const subtitle = elementOfType(element.props.children, ItemSubtitle)
      return subtitle ? textFromNode(subtitle.props.children) : ''
    }

    function itemDisabled(element: ReactElement<MarkerProps>): boolean {
      return element.props.disabled === true
    }

    function itemHidden(element: ReactElement<MarkerProps>): boolean {
      return element.props.hidden === true
    }

    function itemsFrom(state: ParseState, childrenToParse: ReactNode): MenuItem[] {
      const items: MenuItem[] = []

      function append(item: MenuItem) {
        items.push(item)
      }

      for (const child of React.Children.toArray(childrenToParse)) {
        if (!React.isValidElement<MarkerProps>(child)) continue

        if (isMarkerType(child.type, Separator)) {
          const id = `one-menu-divider-${state.nextId++}`
          state.seenIds.add(id)
          append({ type: 'divider', id })
          continue
        }

        if (isMarkerType(child.type, Group)) {
          const label = elementOfType(child.props.children, Label)
          append({
            type: 'section',
            id: actionId(state, child),
            title: label ? textFromNode(label.props.children) : '',
            children: itemsFrom(state, child.props.children),
          })
          continue
        }

        if (isMarkerType(child.type, Sub)) {
          const subTrigger = elementOfType(child.props.children, SubTrigger)
          const subContent = elementOfType(child.props.children, SubContent)
          if (!subTrigger || !subContent) {
            throw new Error(
              'Tamagui native submenus require one SubTrigger and SubContent',
            )
          }
          append({
            type: 'submenu',
            id: actionId(state, child),
            title: itemTitle(subTrigger),
            systemImage: actionImage(subTrigger),
            disabled: itemDisabled(subTrigger),
            hidden: itemHidden(subTrigger),
            children: itemsFrom(state, subContent.props.children),
          })
          continue
        }

        if (isMarkerType(child.type, CheckboxItem)) {
          const id = actionId(state, child)
          const current =
            child.props.value === true ||
            child.props.value === 'on' ||
            child.props.checked === true
          const onValueChange = child.props.onValueChange
          const onCheckedChange = child.props.onCheckedChange
          state.handlers.set(id, (value) => {
            const next = value ?? !current
            if (typeof onValueChange === 'function') {
              onValueChange(next ? 'on' : 'off', next ? 'off' : 'on')
            } else if (typeof onCheckedChange === 'function') {
              onCheckedChange(next)
            }
          })
          append({
            type: 'toggle',
            id,
            title: itemTitle(child),
            systemImage: actionImage(child),
            values: [current],
            disabled: itemDisabled(child),
            hidden: itemHidden(child),
            help: itemHelp(child),
          })
          continue
        }

        if (!isMarkerType(child.type, Item)) continue

        const id = actionId(state, child)
        const onSelect = child.props.onSelect
        if (typeof onSelect === 'function') {
          state.handlers.set(id, () => onSelect())
        }
        append({
          type: 'action',
          id,
          title: itemTitle(child),
          systemImage: actionImage(child),
          // One's item role has no empty member, so a non-destructive item
          // carries no role key at all rather than an empty one.
          ...(child.props.destructive === true ? { role: 'destructive' as const } : {}),
          disabled: itemDisabled(child),
          hidden: itemHidden(child),
          help: itemHelp(child),
        })
      }

      return items
    }

    function Root({
      children,
      onOpenChange,
      onOpenWillChange,
    }: {
      children?: ReactNode
      onOpenChange?: (open: boolean) => void
      onOpenWillChange?: (open: boolean) => void
    }) {
      const trigger = elementOfType(children, Trigger)
      const content = elementOfType(children, Content)
      const preview = elementOfType(children, Preview)
      const auxiliary = elementOfType(children, Auxiliary)

      if (preview || auxiliary) {
        warnUnsupported('context-menu previews or auxiliary views')
      }
      if (!trigger || !content) {
        throw new Error('Tamagui native menus require one Trigger and one Content')
      }

      const state: ParseState = { nextId: 0, seenIds: new Set(), handlers: new Map() }
      const label = elementOfType(content.props.children, Label)
      const contentItems = itemsFrom(state, content.props.children)
      let items: MenuItems = contentItems
      if (label) {
        const titleId = `one-menu-title-${state.nextId++}`
        state.seenIds.add(titleId)
        items = [
          {
            type: 'section',
            id: titleId,
            title: textFromNode(label.props.children),
            children: contentItems,
          },
        ]
      }

      // One reports no open or close event, so only the close half of the
      // expo adapter's open notifications survives: an action always dismisses.
      const handleAction = (id: string) => {
        state.handlers.get(id)?.()
        onOpenWillChange?.(false)
        onOpenChange?.(false)
      }

      const triggerLabel =
        typeof trigger.props.accessibilityLabel === 'string'
          ? trigger.props.accessibilityLabel
          : ''
      const MenuHost = Platform.OS === 'android' ? One.Android.Menu : One.iOS.Menu
      const ContextMenuHost =
        Platform.OS === 'android' ? One.Android.ContextMenu : One.iOS.ContextMenu
      return isContextMenu ? (
        <ContextMenuHost
          items={items}
          onAction={handleAction}
          onValueChange={(id, value) => state.handlers.get(id)?.(value)}
          accessibilityLabel={triggerLabel}
        >
          {trigger.props.children}
        </ContextMenuHost>
      ) : (
        <MenuHost
          items={items}
          onAction={handleAction}
          onValueChange={(id, value) => state.handlers.get(id)?.(value)}
          accessibilityLabel={triggerLabel}
        >
          {trigger.props.children}
        </MenuHost>
      )
    }

    return {
      Root,
      Trigger,
      Content,
      Item,
      ItemTitle,
      ItemSubtitle,
      ItemIcon,
      ItemImage,
      ItemIndicator,
      Group,
      Label,
      Separator,
      Sub,
      SubTrigger,
      SubContent,
      CheckboxItem,
      Preview,
      Auxiliary,
    }
  }

  return {
    name: 'one',
    Menu: createModule(false),
    ContextMenu: createModule(true),
  }
}
