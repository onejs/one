import {
  Children,
  isValidElement,
  useMemo,
  type ReactElement,
  type ReactNode,
} from 'react'
import { Platform } from 'react-native'
import { assertSwiftUIValue } from './generated/swiftui'
import { dispatchSDKEvent, swiftStyleNative } from './generated/swiftStyleNative'
import { InsideContainer, assertOneNativeChildren } from './containerChildren'
import NativeNavigationStack from './specs/OneNativeNavigationStackNativeComponent'
import NativeContent from './specs/OneNativeNavigationStackContentNativeComponent'
import NativeToolbar from './specs/OneNativeToolbarNativeComponent'
import NativeToolbarItem from './specs/OneNativeToolbarItemNativeComponent'
import NativeToolbarItemGroup from './specs/OneNativeToolbarItemGroupNativeComponent'
import NativeToolbarSpacer from './specs/OneNativeToolbarSpacerNativeComponent'
import { viewportStyle } from './viewportStyle'
import type {
  NavigationStackProps,
  ToolbarItemGroupProps,
  ToolbarItemProps,
  ToolbarProps,
  ToolbarSpacerProps,
} from './generated/containerTypes'

// the root content is a Fabric child of the stack that hosts the React Native subtree in
// the box SwiftUI proposes, so its descendants are laid out by that box and not by Yoga.
const CONTENT_STYLE = { position: 'absolute', left: 0, top: 0 } as const

const TOOLBAR_CHILDREN =
  'Swift.ToolbarItem, Swift.ToolbarItemGroup, and Swift.ToolbarSpacer'

// the three markers are read by Swift.Toolbar and Swift.NavigationStack and never render
// where they are written, exactly like Swift.Tab inside Swift.Tabs.
export function Toolbar(_props: ToolbarProps): never {
  throw new Error('Swift.Toolbar must be a direct child of Swift.NavigationStack or Swift.Tabs')
}

export function ToolbarItem(_props: ToolbarItemProps): never {
  throw new Error('Swift.ToolbarItem must be a direct child of Swift.Toolbar')
}

export function ToolbarItemGroup(_props: ToolbarItemGroupProps): never {
  throw new Error('Swift.ToolbarItemGroup must be a direct child of Swift.Toolbar')
}

export function ToolbarSpacer(_props: ToolbarSpacerProps): never {
  throw new Error('Swift.ToolbarSpacer must be a direct child of Swift.Toolbar')
}

// every placement the SDK declares is accepted, and one it does not is rejected before a
// native prop carries it.
function toolbarPlacement(value: string | undefined, owner: string, iosVersion: number) {
  const placement = value ?? 'automatic'
  if (typeof placement !== 'string')
    throw new Error(`${owner} placement must be a string`)
  assertSwiftUIValue('ToolbarItemPlacement', placement, iosVersion)
  return placement
}

function ToolbarItemNode({
  element,
  iosVersion,
}: {
  element: ReactElement<ToolbarItemProps>
  iosVersion: number
}) {
  const props = element.props
  if (Children.count(props.children) === 0)
    throw new Error('Swift.ToolbarItem needs children')
  assertOneNativeChildren(props.children, 'Swift.ToolbarItem')
  return (
    <NativeToolbarItem
      {...props}
      placement={toolbarPlacement(props.placement, 'Swift.ToolbarItem', iosVersion)}
      swiftStyle={swiftStyleNative(props.swiftStyle)}
      onNativeSDKEvent={({ nativeEvent }) =>
        dispatchSDKEvent(props.swiftStyle, nativeEvent.name, nativeEvent.value)
      }
    >
      <InsideContainer value={true}>{props.children}</InsideContainer>
    </NativeToolbarItem>
  )
}

function ToolbarItemGroupNode({
  element,
  iosVersion,
}: {
  element: ReactElement<ToolbarItemGroupProps>
  iosVersion: number
}) {
  const props = element.props
  if (Children.count(props.children) === 0)
    throw new Error('Swift.ToolbarItemGroup needs children')
  assertOneNativeChildren(props.children, 'Swift.ToolbarItemGroup')
  if (props.systemImage !== undefined && !props.label)
    throw new Error('Swift.ToolbarItemGroup systemImage requires a label')
  return (
    <NativeToolbarItemGroup
      {...props}
      label={props.label ?? ''}
      systemImage={props.systemImage ?? ''}
      placement={toolbarPlacement(props.placement, 'Swift.ToolbarItemGroup', iosVersion)}
      swiftStyle={swiftStyleNative(props.swiftStyle)}
      onNativeSDKEvent={({ nativeEvent }) =>
        dispatchSDKEvent(props.swiftStyle, nativeEvent.name, nativeEvent.value)
      }
    >
      <InsideContainer value={true}>{props.children}</InsideContainer>
    </NativeToolbarItemGroup>
  )
}

function ToolbarSpacerNode({
  element,
  iosVersion,
}: {
  element: ReactElement<ToolbarSpacerProps>
  iosVersion: number
}) {
  const props = element.props
  if (Children.count(props.children) !== 0)
    throw new Error('Swift.ToolbarSpacer takes no children')
  if (iosVersion < 26) throw new Error('Swift.ToolbarSpacer requires iOS 26 or later')
  const sizing = props.sizing ?? 'flexible'
  assertSwiftUIValue('SpacerSizing', sizing, iosVersion)
  return (
    <NativeToolbarSpacer
      {...props}
      sizing={sizing}
      placement={toolbarPlacement(props.placement, 'Swift.ToolbarSpacer', iosVersion)}
    />
  )
}

// one Swift.Toolbar becomes one native toolbar: its markers read as toolbar entries in
// the order they are written, and the stack merges every toolbar it is given.
export function ToolbarNode({
  children,
  iosVersion,
}: {
  children: ReactNode
  iosVersion: number
}) {
  const items = Children.toArray(children).map((child, index) => {
    if (!isValidElement(child))
      throw new Error(`Swift.Toolbar children must be elements: ${TOOLBAR_CHILDREN}`)
    const element = child as { type: unknown }
    const key = `${index}`
    if (element.type === ToolbarItem)
      return (
        <ToolbarItemNode
          key={key}
          element={child as ReactElement<ToolbarItemProps>}
          iosVersion={iosVersion}
        />
      )
    if (element.type === ToolbarItemGroup)
      return (
        <ToolbarItemGroupNode
          key={key}
          element={child as ReactElement<ToolbarItemGroupProps>}
          iosVersion={iosVersion}
        />
      )
    if (element.type === ToolbarSpacer)
      return (
        <ToolbarSpacerNode
          key={key}
          element={child as ReactElement<ToolbarSpacerProps>}
          iosVersion={iosVersion}
        />
      )
    throw new Error(`Swift.Toolbar accepts ${TOOLBAR_CHILDREN} elements as children`)
  })
  return <NativeToolbar>{items}</NativeToolbar>
}

// a real SwiftUI NavigationStack whose root is the React Native content beside it, with
// the navigation bar filled by Swift.Toolbar. navigationTitle,
// navigationBarTitleDisplayMode, and every other scalar navigation or toolbar modifier
// reach the stack through swiftStyle, so nothing about the bar is a bespoke prop.
export function NavigationStack({
  children,
  swiftStyle,
  style,
  ...props
}: NavigationStackProps) {
  const iosVersion = Number.parseFloat(String(Platform.Version))
  const { toolbars, content } = useMemo(() => {
    const toolbars: ReactNode[] = []
    const content: ReactNode[] = []
    for (const child of Children.toArray(children)) {
      if (child === null || child === undefined || typeof child === 'boolean') continue
      if (isValidElement(child)) {
        if (child.type === Toolbar) {
          toolbars.push(child)
          continue
        }
        if (
          child.type === ToolbarItem ||
          child.type === ToolbarItemGroup ||
          child.type === ToolbarSpacer
        )
          throw new Error(
            `Swift.NavigationStack accepts Swift.Toolbar elements or React Native content as children; ${TOOLBAR_CHILDREN} belong inside Swift.Toolbar`
          )
      }
      content.push(child)
    }
    return { toolbars, content }
  }, [children])

  return (
    <NativeNavigationStack
      {...props}
      style={viewportStyle(style)}
      swiftStyle={swiftStyleNative(swiftStyle)}
      onNativeSDKEvent={({ nativeEvent }) =>
        dispatchSDKEvent(swiftStyle, nativeEvent.name, nativeEvent.value)
      }
    >
      {toolbars.map((toolbar, index) => (
        <ToolbarNode key={index} iosVersion={iosVersion}>
          {(toolbar as ReactElement<ToolbarProps>).props.children}
        </ToolbarNode>
      ))}
      <NativeContent collapsable={false} style={CONTENT_STYLE}>
        <InsideContainer value={false}>{content}</InsideContainer>
      </NativeContent>
    </NativeNavigationStack>
  )
}
