import {
  Children,
  Fragment,
  createContext,
  isValidElement,
  useContext,
  type ReactNode,
} from 'react'
import {
  Image,
  Platform,
  ScrollView as RNScrollView,
  Text as RNText,
  TextInput,
  View,
} from 'react-native'
import NativeContainerSlot from './specs/OneNativeContainerSlotNativeComponent'
import NativeControlGroup from './specs/OneNativeControlGroupNativeComponent'
import NativeDisclosureGroup from './specs/OneNativeDisclosureGroupNativeComponent'
import NativeDivider from './specs/OneNativeDividerNativeComponent'
import NativeForm from './specs/OneNativeFormNativeComponent'
import NativeGlass from './specs/OneNativeGlassNativeComponent'
import NativeGroup from './specs/OneNativeGroupNativeComponent'
import NativeHost from './specs/OneNativeHostNativeComponent'
import NativeLabeledContent from './specs/OneNativeLabeledContentNativeComponent'
import NativeLazyHStack from './specs/OneNativeLazyHStackNativeComponent'
import NativeLazyVStack from './specs/OneNativeLazyVStackNativeComponent'
import NativeLink from './specs/OneNativeLinkNativeComponent'
import NativeList from './specs/OneNativeListNativeComponent'
import NativeOverlay from './specs/OneNativeOverlayNativeComponent'
import NativeOverlayContent from './specs/OneNativeOverlayContentNativeComponent'
import NativeScrollView from './specs/OneNativeScrollViewNativeComponent'
import NativeSwipeActions from './specs/OneNativeSwipeActionsNativeComponent'
import NativeSwipeActionsActions from './specs/OneNativeSwipeActionsActionsNativeComponent'
import NativeSection from './specs/OneNativeSectionNativeComponent'
import NativeSpacer from './specs/OneNativeSpacerNativeComponent'
import NativeZStack from './specs/OneNativeZStackNativeComponent'
import { assertSwiftUIValue } from './generated/swiftui'
import { useControlled } from './controlled'
import { labeledContentProps } from './labeledContent'
import { Pager } from './Pager.native'
import { Tabs } from './Tabs.native'
import { viewportStyle } from './viewportStyle'
import {
  lazyHStackAlignments,
  lazyVStackAlignments,
  listRowSeparatorEdges,
  listSectionMarginsEdges,
  scrollViewAxes,
  type LazyHStackProps,
  type LazyVStackProps,
  type ListModifierProps,
  type ListProps,
  type ScrollViewProps,
} from './listTypes'
import {
  swipeActionsEdges,
  type ControlGroupProps,
  type DisclosureGroupProps,
  type DividerProps,
  type GroupProps,
  type LinkProps,
  type OverlayContentProps,
  type OverlayProps,
  type SwipeActionsActionsProps,
  type SwipeActionsProps,
} from './groupTypes'
import {
  hostAlignments,
  hostAxes,
  zStackAlignments,
  type EnvironmentProps,
  type FormProps,
  type GlassProps,
  type HostAxis,
  type HostProps,
  type LabeledContentProps,
  type SectionProps,
  type SlotProps,
  type SpacerProps,
  type StackProps,
  type ZStackProps,
} from './generated/containerTypes'
import { glassEffects, glassEffectShapes, materials } from './generated/controlTypes'

// a slot only works where SwiftUI proposes its box, so containers mark their children
// and a slot marks its own React Native subtree as outside again.
export const InsideContainer = createContext(false)

const containers =
  'Swift.Host, Swift.HStack, Swift.VStack, Swift.ZStack, Swift.Form, Swift.Section, Swift.Glass, Swift.List, Swift.ScrollView, Swift.LazyVStack, Swift.LazyHStack, Swift.ControlGroup, Swift.DisclosureGroup, Swift.Link, Swift.Group, Swift.Overlay, or Swift.SwipeActions'

function nativeEnvironmentProps({
  colorScheme,
  dynamicTypeSize,
  locale,
  tint,
  isEnabled,
}: EnvironmentProps) {
  const iosVersion = Number.parseFloat(String(Platform.Version))
  if (colorScheme) assertSwiftUIValue('ColorScheme', colorScheme, iosVersion)
  if (dynamicTypeSize) assertSwiftUIValue('DynamicTypeSize', dynamicTypeSize, iosVersion)
  if (locale !== undefined && (typeof locale !== 'string' || !locale.trim()))
    throw new Error('Swift.Host and Swift.Form locale must be a non-empty identifier')
  return {
    colorScheme: colorScheme ?? '',
    dynamicTypeSize: dynamicTypeSize ?? '',
    locale: locale ?? '',
    tint,
    isEnabled: isEnabled === undefined ? '' : isEnabled ? 'enabled' : 'disabled',
  }
}

function assertNoGreedyContainer(children: ReactNode, owner: string) {
  for (const child of Children.toArray(children)) {
    if (!isValidElement(child)) continue
    const name =
      child.type === Form
        ? 'Swift.Form'
        : child.type === List
          ? 'Swift.List'
          : child.type === ScrollView
            ? 'Swift.ScrollView'
            : child.type === DisclosureGroup
              ? 'Swift.DisclosureGroup'
              : child.type === Tabs
                ? 'Swift.Tabs'
                : child.type === Pager
                  ? 'Swift.Pager'
                  : null
    // these all take the box they are given instead of reporting an ideal height,
    // so a measured parent reads zero for one and renders nothing at all.
    if (name)
      throw new Error(`${name} cannot be a child of ${owner}; give it its own box`)
  }
}

// the native insertChild preconditions on non-composable children, so the wrappers
// fail first with a JavaScript stack: a denylist, because a custom component that
// renders SwiftUI inside is a function too and must stay legal. composite and
// third-party native views fall through to the native gate.
const reactNativeChildren = new Set<unknown>(
  [View, RNText, Image, RNScrollView, TextInput].filter(Boolean)
)

export function assertOneNativeChildren(children: ReactNode, owner: string) {
  for (const child of Children.toArray(children)) {
    if (child === null || child === undefined || typeof child === 'boolean') continue
    if (typeof child === 'string' || typeof child === 'number')
      throw new Error(`${owner} takes SwiftUI children, not raw text or numbers`)
    if (!isValidElement<{ children?: ReactNode }>(child)) continue
    // a fragment mounts its contents directly, so its children are checked too.
    if (child.type === Fragment) {
      assertOneNativeChildren(child.props.children, owner)
      continue
    }
    if (typeof child.type === 'string' || reactNativeChildren.has(child.type))
      throw new Error(
        `${owner} takes SwiftUI children; move React Native content into Swift.Slot`
      )
  }
}

type HostStackProps = HostProps & { name: string; axis: HostAxis }

function HostStack({
  name,
  axis,
  spacing = 0,
  alignment = 'leading',
  colorScheme,
  dynamicTypeSize,
  locale,
  tint,
  isEnabled,
  children,
  style,
  ...props
}: HostStackProps) {
  if (!hostAxes.includes(axis))
    throw new Error(`${name} axis must be one of ${hostAxes.join(', ')}`)
  if (!hostAlignments.includes(alignment))
    throw new Error(`${name} alignment must be one of ${hostAlignments.join(', ')}`)
  if (!Number.isFinite(spacing) || spacing < 0)
    throw new Error(`${name} spacing must be a non-negative number`)
  assertNoGreedyContainer(children, name)
  assertOneNativeChildren(children, name)
  return (
    <NativeHost
      {...props}
      style={[{ alignSelf: 'stretch' }, style]}
      axis={axis}
      spacing={spacing}
      alignment={alignment}
      {...nativeEnvironmentProps({
        colorScheme,
        dynamicTypeSize,
        locale,
        tint,
        isEnabled,
      })}
    >
      <InsideContainer value={true}>{children}</InsideContainer>
    </NativeHost>
  )
}

export function Host({ axis = 'vertical', ...props }: HostProps) {
  return <HostStack {...props} name="Swift.Host" axis={axis} />
}

export function HStack(props: StackProps) {
  return <HostStack {...props} name="Swift.HStack" axis="horizontal" />
}

export function VStack(props: StackProps) {
  return <HostStack {...props} name="Swift.VStack" axis="vertical" />
}

export function ZStack({ alignment = 'center', children, style, ...props }: ZStackProps) {
  if (!zStackAlignments.includes(alignment))
    throw new Error(
      `Swift.ZStack alignment must be one of ${zStackAlignments.join(', ')}`
    )
  assertNoGreedyContainer(children, 'Swift.ZStack')
  assertOneNativeChildren(children, 'Swift.ZStack')
  return (
    <NativeZStack
      {...props}
      style={[{ alignSelf: 'stretch' }, style]}
      alignment={alignment}
    >
      <InsideContainer value={true}>{children}</InsideContainer>
    </NativeZStack>
  )
}

export function Spacer({ minLength = 0, style, ...props }: SpacerProps) {
  const inside = useContext(InsideContainer)
  if (!inside) throw new Error(`Swift.Spacer must be a child of ${containers}`)
  if (!Number.isFinite(minLength) || minLength < 0)
    throw new Error('Swift.Spacer minLength must be a non-negative number')
  return <NativeSpacer {...props} style={style} minLength={minLength} />
}

const formSizings = ['fill', 'content'] as const

export function Form({
  children,
  style,
  sizing = 'fill',
  colorScheme,
  dynamicTypeSize,
  locale,
  tint,
  isEnabled,
  ...props
}: FormProps) {
  if (!formSizings.includes(sizing))
    throw new Error(`Swift.Form sizing must be one of ${formSizings.join(', ')}`)
  assertOneNativeChildren(children, 'Swift.Form')
  return (
    // sizing is structural: a remount keeps a fill form from inheriting a content
    // height Yoga pinned, and a content form from inheriting a fill box.
    <NativeForm
      key={sizing}
      {...props}
      {...nativeEnvironmentProps({
        colorScheme,
        dynamicTypeSize,
        locale,
        tint,
        isEnabled,
      })}
      sizing={sizing}
      style={
        sizing === 'content' ? [{ alignSelf: 'stretch' }, style] : [{ flex: 1 }, style]
      }
    >
      <InsideContainer value={true}>{children}</InsideContainer>
    </NativeForm>
  )
}

// the list row and section modifiers List and Section share, validated once. strings
// cross as '' when unset and numbers as -1, which native reads as "not set".
function nativeListModifierProps(name: string, props: ListModifierProps) {
  const {
    listRowSeparator,
    listRowSeparatorEdges: separatorEdges,
    listRowInsetsTop,
    listRowInsetsLeading,
    listRowInsetsBottom,
    listRowInsetsTrailing,
    listSectionSpacing,
    listSectionMarginsLength,
    listSectionMarginsEdges: marginsEdges,
    headerProminence,
  } = props
  const iosVersion = Number.parseFloat(String(Platform.Version))
  if (listRowSeparator !== undefined)
    assertSwiftUIValue('Visibility', listRowSeparator, iosVersion)
  if (separatorEdges !== undefined && !listRowSeparatorEdges.includes(separatorEdges))
    throw new Error(
      `${name} listRowSeparatorEdges must be one of ${listRowSeparatorEdges.join(', ')}`
    )
  const insets = {
    listRowInsetsTop,
    listRowInsetsLeading,
    listRowInsetsBottom,
    listRowInsetsTrailing,
  }
  for (const [key, value] of Object.entries(insets)) {
    if (value !== undefined && (!Number.isFinite(value) || value < 0))
      throw new Error(`${name} ${key} must be a non-negative number`)
  }
  const insetValues = Object.values(insets)
  if (
    insetValues.some((value) => value !== undefined) &&
    insetValues.some((value) => value === undefined)
  )
    throw new Error(`${name} listRowInsets needs all four edges or none`)
  let spacing = ''
  let spacingValue = -1
  if (typeof listSectionSpacing === 'number') {
    if (!Number.isFinite(listSectionSpacing) || listSectionSpacing < 0)
      throw new Error(`${name} listSectionSpacing must be a non-negative number`)
    spacingValue = listSectionSpacing
  } else if (listSectionSpacing !== undefined) {
    assertSwiftUIValue('ListSectionSpacing', listSectionSpacing, iosVersion)
    spacing = listSectionSpacing
  }
  if (
    (listSectionMarginsLength !== undefined || marginsEdges !== undefined) &&
    iosVersion < 26
  )
    throw new Error('listSectionMargins requires iOS 26')
  if (
    listSectionMarginsLength !== undefined &&
    (!Number.isFinite(listSectionMarginsLength) || listSectionMarginsLength < 0)
  )
    throw new Error(`${name} listSectionMarginsLength must be a non-negative number`)
  if (marginsEdges !== undefined && !listSectionMarginsEdges.includes(marginsEdges))
    throw new Error(
      `${name} listSectionMarginsEdges must be one of ${listSectionMarginsEdges.join(', ')}`
    )
  if (headerProminence !== undefined)
    assertSwiftUIValue('Prominence', headerProminence, iosVersion)
  return {
    listRowSeparator: listRowSeparator ?? '',
    listRowSeparatorEdges: separatorEdges ?? '',
    listRowInsetsTop: listRowInsetsTop ?? -1,
    listRowInsetsLeading: listRowInsetsLeading ?? -1,
    listRowInsetsBottom: listRowInsetsBottom ?? -1,
    listRowInsetsTrailing: listRowInsetsTrailing ?? -1,
    listSectionSpacing: spacing,
    listSectionSpacingValue: spacingValue,
    listSectionMarginsLength: listSectionMarginsLength ?? -1,
    listSectionMarginsEdges: marginsEdges ?? '',
    headerProminence: headerProminence ?? '',
  }
}

export function Section({
  title = '',
  footer = '',
  children,
  style,
  ...props
}: SectionProps) {
  if (typeof title !== 'string' || typeof footer !== 'string')
    throw new Error('Swift.Section title and footer must be strings')
  assertOneNativeChildren(children, 'Swift.Section')
  return (
    <NativeSection
      {...props}
      style={[{ flex: 1 }, style]}
      title={title}
      footer={footer}
      {...nativeListModifierProps('Swift.Section', props)}
    >
      <InsideContainer value={true}>{children}</InsideContainer>
    </NativeSection>
  )
}

export function List({ listStyle = 'automatic', children, style, ...props }: ListProps) {
  assertSwiftUIValue('ListStyle', listStyle, Number.parseFloat(String(Platform.Version)))
  assertOneNativeChildren(children, 'Swift.List')
  return (
    <NativeList
      {...props}
      style={viewportStyle(style)}
      listStyle={listStyle}
      {...nativeListModifierProps('Swift.List', props)}
    >
      <InsideContainer value={true}>{children}</InsideContainer>
    </NativeList>
  )
}

export function ScrollView({
  axes = 'vertical',
  showsIndicators = true,
  children,
  style,
  ...props
}: ScrollViewProps) {
  if (!scrollViewAxes.includes(axes))
    throw new Error(`Swift.ScrollView axes must be one of ${scrollViewAxes.join(', ')}`)
  assertOneNativeChildren(children, 'Swift.ScrollView')
  return (
    <NativeScrollView
      {...props}
      style={viewportStyle(style)}
      axes={axes}
      showsIndicators={showsIndicators}
    >
      <InsideContainer value={true}>{children}</InsideContainer>
    </NativeScrollView>
  )
}

export function LazyVStack({
  alignment = 'center',
  spacing,
  children,
  style,
  ...props
}: LazyVStackProps) {
  if (!lazyVStackAlignments.includes(alignment))
    throw new Error(
      `Swift.LazyVStack alignment must be one of ${lazyVStackAlignments.join(', ')}`
    )
  if (spacing !== undefined && (!Number.isFinite(spacing) || spacing < 0))
    throw new Error('Swift.LazyVStack spacing must be a non-negative number')
  assertOneNativeChildren(children, 'Swift.LazyVStack')
  return (
    <NativeLazyVStack
      {...props}
      style={[{ alignSelf: 'stretch' }, style]}
      alignment={alignment}
      spacing={spacing ?? -1}
    >
      <InsideContainer value={true}>{children}</InsideContainer>
    </NativeLazyVStack>
  )
}

export function LazyHStack({
  alignment = 'center',
  spacing,
  children,
  style,
  ...props
}: LazyHStackProps) {
  if (!lazyHStackAlignments.includes(alignment))
    throw new Error(
      `Swift.LazyHStack alignment must be one of ${lazyHStackAlignments.join(', ')}`
    )
  if (spacing !== undefined && (!Number.isFinite(spacing) || spacing < 0))
    throw new Error('Swift.LazyHStack spacing must be a non-negative number')
  assertOneNativeChildren(children, 'Swift.LazyHStack')
  return (
    <NativeLazyHStack
      {...props}
      style={[{ alignSelf: 'stretch' }, style]}
      alignment={alignment}
      spacing={spacing ?? -1}
    >
      <InsideContainer value={true}>{children}</InsideContainer>
    </NativeLazyHStack>
  )
}

export function LabeledContent({
  label,
  value,
  systemImage,
  children,
  style,
  ...props
}: LabeledContentProps) {
  const content = labeledContentProps({
    label,
    value,
    systemImage,
    hasChildren: Children.toArray(children).length > 0,
  })
  assertOneNativeChildren(children, 'Swift.LabeledContent')
  return (
    <NativeLabeledContent
      {...props}
      style={[{ alignSelf: 'stretch' }, style]}
      label={content.label}
      value={content.value}
      systemImage={content.systemImage}
    >
      <InsideContainer value={true}>{children}</InsideContainer>
    </NativeLabeledContent>
  )
}

export function Glass({
  material,
  glassEffect,
  interactive = false,
  shape,
  cornerRadius,
  tint,
  children,
  style,
  ...props
}: GlassProps) {
  if (glassEffect !== undefined && !glassEffects.includes(glassEffect))
    throw new Error(`Swift.Glass glassEffect must be one of ${glassEffects.join(', ')}`)
  if (material !== undefined && !materials.includes(material))
    throw new Error(`Swift.Glass material must be one of ${materials.join(', ')}`)
  if (shape !== undefined && !glassEffectShapes.includes(shape))
    throw new Error(`Swift.Glass shape must be one of ${glassEffectShapes.join(', ')}`)
  if (cornerRadius !== undefined && (!Number.isFinite(cornerRadius) || cornerRadius < 0))
    throw new Error('Swift.Glass cornerRadius must be a non-negative number')
  if (shape !== undefined && shape !== 'roundedRectangle' && cornerRadius !== undefined)
    throw new Error('Swift.Glass cornerRadius requires shape="roundedRectangle"')
  assertOneNativeChildren(children, 'Swift.Glass')
  return (
    <NativeGlass
      {...props}
      style={[{ alignSelf: 'stretch' }, style]}
      material={material ?? ''}
      glassEffect={glassEffect ?? (material ? '' : 'regular')}
      interactive={interactive}
      shape={shape ?? ''}
      cornerRadius={cornerRadius ?? -1}
      tint={tint}
    >
      <InsideContainer value={true}>{children}</InsideContainer>
    </NativeGlass>
  )
}

export function ControlGroup({
  label = '',
  systemImage = '',
  controlGroupStyle = 'automatic',
  children,
  style,
  ...props
}: ControlGroupProps) {
  if (typeof label !== 'string' || typeof systemImage !== 'string')
    throw new Error('Swift.ControlGroup label and systemImage must be strings')
  assertSwiftUIValue(
    'ControlGroupStyle',
    controlGroupStyle,
    Number.parseFloat(String(Platform.Version))
  )
  assertOneNativeChildren(children, 'Swift.ControlGroup')
  return (
    <NativeControlGroup
      {...props}
      style={[{ alignSelf: 'stretch' }, style]}
      label={label}
      systemImage={systemImage}
      controlGroupStyle={controlGroupStyle}
    >
      <InsideContainer value={true}>{children}</InsideContainer>
    </NativeControlGroup>
  )
}

export function DisclosureGroup({
  label,
  isExpanded,
  onIsExpandedChange,
  revision = 0,
  children,
  style,
  ...props
}: DisclosureGroupProps) {
  if (typeof label !== 'string' || !label)
    throw new Error('Swift.DisclosureGroup label must be a non-empty string')
  if (typeof isExpanded !== 'boolean')
    throw new Error('Swift.DisclosureGroup isExpanded must be a boolean')
  assertOneNativeChildren(children, 'Swift.DisclosureGroup')
  const controlled = useControlled<{
    value: boolean
    eventCount: number
    revision: number
  }>((event) => onIsExpandedChange(event.value), revision)
  return (
    <NativeDisclosureGroup
      {...props}
      style={[{ alignSelf: 'stretch' }, style]}
      label={label}
      isExpanded={isExpanded}
      acknowledgedEvent={controlled.acknowledgedEvent}
      revision={revision}
      onNativeDisclosureGroupIsExpandedChange={({ nativeEvent }) =>
        controlled.onNativeChange(nativeEvent)
      }
    >
      <InsideContainer value={true}>{children}</InsideContainer>
    </NativeDisclosureGroup>
  )
}

export function Divider({ children, style, ...props }: DividerProps) {
  const inside = useContext(InsideContainer)
  if (!inside) throw new Error(`Swift.Divider must be a child of ${containers}`)
  if (Children.toArray(children).length > 0)
    throw new Error('Swift.Divider holds no content')
  return <NativeDivider {...props} style={style} />
}

export function Link({ destination, label = '', children, style, ...props }: LinkProps) {
  if (typeof destination !== 'string' || !destination)
    throw new Error('Swift.Link destination must be a non-empty string')
  try {
    new URL(destination)
  } catch {
    throw new Error('Swift.Link destination must be a parseable URL')
  }
  // composed children win over the label string, so a conditional label view falls
  // back to the label when it is absent.
  if (Children.toArray(children).length === 0 && !label)
    throw new Error('Swift.Link needs a label or children')
  assertOneNativeChildren(children, 'Swift.Link')
  return (
    <NativeLink
      {...props}
      style={[{ alignSelf: 'stretch' }, style]}
      destination={destination}
      label={label}
    >
      <InsideContainer value={true}>{children}</InsideContainer>
    </NativeLink>
  )
}

export function Group({ children, style, ...props }: GroupProps) {
  assertOneNativeChildren(children, 'Swift.Group')
  return (
    <NativeGroup {...props} style={[{ alignSelf: 'stretch' }, style]}>
      <InsideContainer value={true}>{children}</InsideContainer>
    </NativeGroup>
  )
}

export function OverlayContent({ children, style, ...props }: OverlayContentProps) {
  assertOneNativeChildren(children, 'Swift.Overlay.Content')
  return (
    <NativeOverlayContent {...props} style={style}>
      <InsideContainer value={true}>{children}</InsideContainer>
    </NativeOverlayContent>
  )
}

function OverlayFn({ alignment = 'center', children, style, ...props }: OverlayProps) {
  if (!zStackAlignments.includes(alignment))
    throw new Error(
      `Swift.Overlay alignment must be one of ${zStackAlignments.join(', ')}`
    )
  const markers = Children.toArray(children).filter(
    (child) => isValidElement(child) && child.type === OverlayContent
  )
  if (markers.length > 1)
    throw new Error('Swift.Overlay takes a single Overlay.Content child')
  assertOneNativeChildren(children, 'Swift.Overlay')
  return (
    <NativeOverlay
      {...props}
      style={[{ alignSelf: 'stretch' }, style]}
      alignment={alignment}
    >
      <InsideContainer value={true}>{children}</InsideContainer>
    </NativeOverlay>
  )
}

export const Overlay = Object.assign(OverlayFn, { Content: OverlayContent })

export function SwipeActionsActions({
  edge = 'trailing',
  allowsFullSwipe = true,
  children,
  style,
  ...props
}: SwipeActionsActionsProps) {
  if (!swipeActionsEdges.includes(edge))
    throw new Error(
      `Swift.SwipeActions edge must be one of ${swipeActionsEdges.join(', ')}`
    )
  assertOneNativeChildren(children, 'Swift.SwipeActions.Actions')
  return (
    <NativeSwipeActionsActions
      {...props}
      style={style}
      edge={edge}
      allowsFullSwipe={allowsFullSwipe}
    >
      <InsideContainer value={true}>{children}</InsideContainer>
    </NativeSwipeActionsActions>
  )
}

function SwipeActionsFn({ children, style, ...props }: SwipeActionsProps) {
  const edges = Children.toArray(children).flatMap((child) =>
    isValidElement<SwipeActionsActionsProps>(child) && child.type === SwipeActionsActions
      ? [child.props.edge ?? 'trailing']
      : []
  )
  if (new Set(edges).size !== edges.length)
    throw new Error('Swift.SwipeActions takes at most one Actions group per edge')
  assertOneNativeChildren(children, 'Swift.SwipeActions')
  return (
    <NativeSwipeActions {...props} style={[{ alignSelf: 'stretch' }, style]}>
      <InsideContainer value={true}>{children}</InsideContainer>
    </NativeSwipeActions>
  )
}

export const SwipeActions = Object.assign(SwipeActionsFn, {
  Actions: SwipeActionsActions,
})

export function Slot({ height, width = 0, children, style, ...props }: SlotProps) {
  const inside = useContext(InsideContainer)
  if (!inside) throw new Error(`Swift.Slot must be a child of ${containers}`)
  if (!Number.isFinite(height) || height <= 0)
    throw new Error('Swift.Slot height must be a positive number')
  if (!Number.isFinite(width) || width < 0)
    throw new Error('Swift.Slot width must be a non-negative number')
  return (
    <NativeContainerSlot {...props} style={style} height={height} width={width}>
      <InsideContainer value={false}>{children}</InsideContainer>
    </NativeContainerSlot>
  )
}
