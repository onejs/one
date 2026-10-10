import {
  Children,
  isValidElement,
  useMemo,
  type ReactElement,
  type ReactNode,
} from 'react'
import { Platform } from 'react-native'
import { dispatchSDKEvent, swiftStyleNative } from './generated/swiftStyleNative'
import NativeContent from './specs/OneNativeNavigationStackContentNativeComponent'
import NativeNavigationSplitView from './specs/OneNativeNavigationSplitViewNativeComponent'
import NativeColumn from './specs/OneNativeNavigationSplitViewColumnNativeComponent'
import { InsideContainer } from './containerChildren'
import {
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  ToolbarItemGroup,
  ToolbarNode,
  ToolbarSpacer,
} from './NavigationStack.native'
import { viewportStyle } from './viewportStyle'
import type {
  NavigationSplitViewColumn,
  NavigationSplitViewColumnProps,
  NavigationSplitViewProps,
  NavigationSplitViewVisibility,
  ToolbarProps,
} from './generated/containerTypes'

const COLUMN_CONTENT_STYLE = { position: 'absolute', left: 0, top: 0 } as const
const COLUMN_MARKER_STYLE = {
  position: 'absolute',
  left: 0,
  top: 0,
  width: '100%',
  height: '100%',
} as const

const columns: readonly NavigationSplitViewColumn[] = ['sidebar', 'content', 'detail']
const visibilities: readonly NavigationSplitViewVisibility[] = [
  'automatic',
  'all',
  'doubleColumn',
  'detailOnly',
]

type SplitMarker = (props: NavigationSplitViewColumnProps) => never

export const Sidebar: SplitMarker = () => {
  throw new Error(
    'Swift.NavigationSplitView.Sidebar must be a direct child of Swift.NavigationSplitView'
  )
}

export const Content: SplitMarker = () => {
  throw new Error(
    'Swift.NavigationSplitView.Content must be a direct child of Swift.NavigationSplitView'
  )
}

export const Detail: SplitMarker = () => {
  throw new Error(
    'Swift.NavigationSplitView.Detail must be a direct child of Swift.NavigationSplitView'
  )
}

type ColumnMarker = typeof Sidebar | typeof Content | typeof Detail

type ColumnEntry = {
  name: NavigationSplitViewColumn
  children: ReactNode
  swiftStyle?: NavigationSplitViewColumnProps['swiftStyle']
}

const columnForMarker = new Map<ColumnMarker, NavigationSplitViewColumn>([
  [Sidebar, 'sidebar'],
  [Content, 'content'],
  [Detail, 'detail'],
])

function toolbarItem(child: ReactNode) {
  if (!isValidElement(child)) return false
  return (
    child.type === ToolbarItem ||
    child.type === ToolbarItemGroup ||
    child.type === ToolbarSpacer
  )
}

function columnChildren(entry: ColumnEntry) {
  const content: ReactNode[] = []
  const toolbarItems: ReactNode[] = []
  let toolbarCount = 0
  let contentMarkerCount = 0

  for (const child of Children.toArray(entry.children)) {
    if (isValidElement(child) && child.type === Toolbar) {
      toolbarCount += 1
      if (toolbarCount > 1)
        throw new Error(
          `Swift.NavigationSplitView.${entry.name} accepts one Swift.Toolbar`
        )
      const toolbarChildren = Children.toArray(
        (child as ReactElement<ToolbarProps>).props.children
      )
      for (const toolbarChild of toolbarChildren) {
        if (isValidElement(toolbarChild) && toolbarChild.type === ToolbarContent) {
          contentMarkerCount += 1
          if (contentMarkerCount > 1)
            throw new Error(
              `Swift.NavigationSplitView.${entry.name} accepts one Swift.Toolbar.Content`
            )
          toolbarItems.push(toolbarChild)
        } else if (toolbarItem(toolbarChild)) {
          throw new Error(
            `Swift.NavigationSplitView.${entry.name} toolbar items must be inside Swift.Toolbar.Content`
          )
        } else if (
          isValidElement(toolbarChild) &&
          (toolbarChild.type === Toolbar || toolbarChild.type === ToolbarContent)
        ) {
          throw new Error(
            `Swift.NavigationSplitView.${entry.name} toolbar markers must be direct children`
          )
        } else {
          content.push(toolbarChild)
        }
      }
      continue
    }
    if (isValidElement(child) && child.type === ToolbarContent)
      throw new Error(
        `Swift.Toolbar.Content must be inside Swift.Toolbar in Swift.NavigationSplitView.${entry.name}`
      )
    if (toolbarItem(child))
      throw new Error(
        `Swift.NavigationSplitView.${entry.name} toolbar items must be inside Swift.Toolbar`
      )
    content.push(child)
  }

  if (content.length === 0)
    throw new Error(`Swift.NavigationSplitView.${entry.name} needs column content`)

  return { content, toolbarItems }
}

function NavigationSplitViewView({
  children,
  columnVisibility,
  onColumnVisibilityChange,
  preferredCompactColumn,
  onPreferredCompactColumnChange,
  swiftStyle,
  style,
  ...props
}: NavigationSplitViewProps) {
  const entries = useMemo(() => {
    const found = new Map<NavigationSplitViewColumn, ColumnEntry>()
    for (const child of Children.toArray(children)) {
      if (!isValidElement(child))
        throw new Error(
          'Swift.NavigationSplitView children must be direct Sidebar, Content, or Detail elements'
        )
      const element = child as ReactElement<NavigationSplitViewColumnProps>
      const name = columnForMarker.get(element.type as ColumnMarker)
      if (!name)
        throw new Error(
          'Swift.NavigationSplitView accepts direct Sidebar, Content, and Detail elements'
        )
      if (found.has(name))
        throw new Error(`Swift.NavigationSplitView accepts one ${name} column`)
      if (Children.count(element.props.children) === 0)
        throw new Error(`Swift.NavigationSplitView.${name} needs children`)
      found.set(name, {
        name,
        children: element.props.children,
        swiftStyle: element.props.swiftStyle,
      })
    }
    if (!found.has('sidebar'))
      throw new Error('Swift.NavigationSplitView needs a Sidebar column')
    if (!found.has('detail'))
      throw new Error('Swift.NavigationSplitView needs a Detail column')
    return columns.flatMap((name) => (found.has(name) ? [found.get(name)!] : []))
  }, [children])

  if (columnVisibility !== undefined && !visibilities.includes(columnVisibility))
    throw new Error(
      `Swift.NavigationSplitView columnVisibility must be one of ${visibilities.join(', ')}`
    )
  if (preferredCompactColumn !== undefined && !columns.includes(preferredCompactColumn))
    throw new Error(
      `Swift.NavigationSplitView preferredCompactColumn must be one of ${columns.join(', ')}`
    )

  const iosVersion = Number.parseFloat(String(Platform.Version))
  const renderedColumns = entries.map((entry) => {
    const { content, toolbarItems } = columnChildren(entry)
    return (
      <NativeColumn
        key={entry.name}
        column={entry.name}
        style={COLUMN_MARKER_STYLE}
        swiftStyle={swiftStyleNative(entry.swiftStyle)}
        onNativeSDKEvent={({ nativeEvent }) =>
          dispatchSDKEvent(entry.swiftStyle, nativeEvent.name, nativeEvent.value)
        }
      >
        {toolbarItems.length > 0 ? (
          <ToolbarNode iosVersion={iosVersion}>{toolbarItems}</ToolbarNode>
        ) : null}
        <NativeContent collapsable={false} style={COLUMN_CONTENT_STYLE}>
          <InsideContainer value={false}>{content}</InsideContainer>
        </NativeContent>
      </NativeColumn>
    )
  })

  return (
    <NativeNavigationSplitView
      {...props}
      style={viewportStyle(style)}
      columnVisibility={columnVisibility ?? 'automatic'}
      columnVisibilityIsControlled={columnVisibility !== undefined}
      preferredCompactColumn={preferredCompactColumn ?? 'sidebar'}
      preferredCompactColumnIsControlled={preferredCompactColumn !== undefined}
      swiftStyle={swiftStyleNative(swiftStyle)}
      onNativeNavigationSplitViewColumnVisibilityChange={({ nativeEvent }) =>
        onColumnVisibilityChange?.(
          nativeEvent.visibility as NavigationSplitViewVisibility
        )
      }
      onNativeNavigationSplitViewPreferredCompactColumnChange={({ nativeEvent }) =>
        onPreferredCompactColumnChange?.(nativeEvent.column as NavigationSplitViewColumn)
      }
      onNativeSDKEvent={({ nativeEvent }) =>
        dispatchSDKEvent(swiftStyle, nativeEvent.name, nativeEvent.value)
      }
    >
      {renderedColumns}
    </NativeNavigationSplitView>
  )
}

export const NavigationSplitView = Object.assign(NavigationSplitViewView, {
  Sidebar,
  Content,
  Detail,
})
