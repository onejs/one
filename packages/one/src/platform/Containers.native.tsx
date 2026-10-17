import {
  Children,
  isValidElement,
  useContext,
  useRef,
  useState,
  type ElementRef,
  type ReactNode,
} from 'react'
import { Platform } from 'react-native'
import { dispatchSDKEvent, swiftStyleNative, validSDKEventValue } from './generated/swiftStyleNative'
import { viewSlotArguments, viewSlotAvailability, viewSlotEvents } from './generated/viewSlots'
import NativeButton from './specs/OneNativeButtonNativeComponent'
import NativeContainerSlot from './specs/OneNativeContainerSlotNativeComponent'
import NativeControlGroup from './specs/OneNativeControlGroupNativeComponent'
import NativeDisclosureGroup from './specs/OneNativeDisclosureGroupNativeComponent'
import NativeDivider from './specs/OneNativeDividerNativeComponent'
import NativeForm from './specs/OneNativeFormNativeComponent'
import NativeGlass from './specs/OneNativeGlassNativeComponent'
import NativeGlassEffectContainer from './specs/OneNativeGlassEffectContainerNativeComponent'
import NativeGeometryReader from './specs/OneNativeGeometryReaderNativeComponent'
import NativeGroup from './specs/OneNativeGroupNativeComponent'
import NativeHost from './specs/OneNativeHostNativeComponent'
import NativeLabeledContent from './specs/OneNativeLabeledContentNativeComponent'
import NativeGroupBox from './specs/OneNativeGroupBoxNativeComponent'
import NativeViewThatFits from './specs/OneNativeViewThatFitsNativeComponent'
import NativeLazyHStack from './specs/OneNativeLazyHStackNativeComponent'
import NativeLazyVStack from './specs/OneNativeLazyVStackNativeComponent'
import NativeLazyVGrid from './specs/OneNativeLazyVGridNativeComponent'
import NativeLazyHGrid from './specs/OneNativeLazyHGridNativeComponent'
import NativeGrid from './specs/OneNativeGridNativeComponent'
import NativeGridRow from './specs/OneNativeGridRowNativeComponent'
import NativeLink from './specs/OneNativeLinkNativeComponent'
import NativeList from './specs/OneNativeListNativeComponent'
import NativeOverlay from './specs/OneNativeOverlayNativeComponent'
import NativeOverlayContent from './specs/OneNativeOverlayContentNativeComponent'
import NativeScrollView from './specs/OneNativeScrollViewNativeComponent'
import NativeScrollViewReader, {
  Commands as ScrollViewReaderCommands,
} from './specs/OneNativeScrollViewReaderNativeComponent'
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
  scrollViewAxes,
  unitPoints,
  type LazyHStackProps,
  type LazyVStackProps,
  type ListProps,
  type ScrollViewProps,
  type ScrollViewProxy,
  type ScrollViewReaderProps,
  type UnitPoint,
} from './listTypes'
import {
  swipeActionsEdges,
  type ControlGroupProps,
  type DisclosureGroupProps,
  type DividerProps,
  type GroupProps,
  type GroupBoxProps,
  type ViewThatFitsProps,
  viewThatFitsAxes,
  type GlassEffectContainerProps,
  type GeometryProxy,
  type GeometryReaderProps,
  type LinkProps,
  type OverlayContentProps,
  type OverlayProps,
  type ViewSlotProps,
  type SwipeActionsActionsProps,
  type SwipeActionsProps,
} from './groupTypes'
import {
  hostAlignments,
  hostAxes,
  zStackAlignments,
  type ButtonProps,
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
import {
  glassEffects,
  glassEffectShapes,
  materials,
  type OneNativeStyle,
} from './generated/controlTypes'
import { InsideContainer, assertOneNativeChildren } from './containerChildren'
import { NavigationStack } from './NavigationStack.native'
import {
  gridAlignments,
  gridHorizontalAlignments,
  gridVerticalAlignments,
  gridItems,
  gridSpacing,
  type GridProps,
  type GridRowProps,
  type LazyHGridProps,
  type LazyVGridProps,
} from './gridTypes'

// the shared container child rules live in one module so the navigation stack can use
// them without importing this file back.
export { InsideContainer, assertOneNativeChildren }

const containers =
  'Swift.Host, Swift.HStack, Swift.VStack, Swift.ZStack, Swift.Form, Swift.Section, Swift.Glass, Swift.GroupBox, Swift.ViewThatFits, Swift.GlassEffectContainer, Swift.List, Swift.ScrollView, Swift.LazyVStack, Swift.LazyHStack, Swift.LazyVGrid, Swift.LazyHGrid, Swift.Grid, Swift.GridRow, Swift.ControlGroup, Swift.DisclosureGroup, Swift.Link, Swift.Group, Swift.Overlay, Swift.SwipeActions, Swift.NavigationStack, Swift.Toolbar, or Swift.ToolbarItem'

function nativeEnvironmentProps({
  colorScheme,
  dynamicTypeSize,
  controlSize,
  locale,
  tint,
  isEnabled,
}: EnvironmentProps) {
  const iosVersion = Number.parseFloat(String(Platform.Version))
  if (colorScheme) assertSwiftUIValue('ColorScheme', colorScheme, iosVersion)
  if (dynamicTypeSize) assertSwiftUIValue('DynamicTypeSize', dynamicTypeSize, iosVersion)
  if (controlSize) assertSwiftUIValue('ControlSize', controlSize, iosVersion)
  if (locale !== undefined && (typeof locale !== 'string' || !locale.trim()))
    throw new Error('Swift.Host and Swift.Form locale must be a non-empty identifier')
  return {
    colorScheme: colorScheme ?? '',
    dynamicTypeSize: dynamicTypeSize ?? '',
    controlSize: controlSize ?? '',
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
            : child.type === Tabs
              ? 'Swift.Tabs'
              : child.type === Pager
                ? 'Swift.Pager'
                : child.type === NavigationStack
                  ? 'Swift.NavigationStack'
                  : null
    // these all take the box they are given instead of reporting an ideal height,
    // so a measured parent reads zero for one and renders nothing at all.
    if (name)
      throw new Error(`${name} cannot be a child of ${owner}; give it its own box`)
  }
}

// every One Native view takes swiftStyle: the converted style and the SDK events its
// modifiers raise travel with the same pair of props.
export function swiftStyleProps(swiftStyle: OneNativeStyle | undefined) {
  return {
    swiftStyle: swiftStyleNative(swiftStyle),
    onNativeSDKEvent: ({ nativeEvent }: { nativeEvent: { name: string; value: string } }) =>
      dispatchSDKEvent(swiftStyle, nativeEvent.name, nativeEvent.value),
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
  controlSize,
  locale,
  tint,
  isEnabled,
  children,
  style,
  swiftStyle,
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
      {...swiftStyleProps(swiftStyle)}
      style={[{ alignSelf: 'stretch' }, style]}
      axis={axis}
      spacing={spacing}
      alignment={alignment}
      {...nativeEnvironmentProps({
        colorScheme,
        dynamicTypeSize,
        controlSize,
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

export function ZStack({ alignment = 'center', children, style, swiftStyle, ...props }: ZStackProps) {
  if (!zStackAlignments.includes(alignment))
    throw new Error(
      `Swift.ZStack alignment must be one of ${zStackAlignments.join(', ')}`
    )
  assertNoGreedyContainer(children, 'Swift.ZStack')
  assertOneNativeChildren(children, 'Swift.ZStack')
  return (
    <NativeZStack
      {...props}
      {...swiftStyleProps(swiftStyle)}
      style={[{ alignSelf: 'stretch' }, style]}
      alignment={alignment}
    >
      <InsideContainer value={true}>{children}</InsideContainer>
    </NativeZStack>
  )
}

export function Spacer({ minLength = 0, style, swiftStyle, ...props }: SpacerProps) {
  const inside = useContext(InsideContainer)
  if (!inside) throw new Error(`Swift.Spacer must be a child of ${containers}`)
  if (!Number.isFinite(minLength) || minLength < 0)
    throw new Error('Swift.Spacer minLength must be a non-negative number')
  return <NativeSpacer {...props} {...swiftStyleProps(swiftStyle)} style={style} minLength={minLength} />
}

const formSizings = ['fill', 'content'] as const

export function Form({
  children,
  style,
  sizing = 'fill',
  colorScheme,
  dynamicTypeSize,
  controlSize,
  locale,
  tint,
  isEnabled,
  swiftStyle,
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
        controlSize,
        locale,
        tint,
        isEnabled,
      })}
      sizing={sizing}
      {...swiftStyleProps(swiftStyle)}
      style={sizing === 'content' ? [{ alignSelf: 'stretch' }, style] : [{ flex: 1 }, style]}
    >
      <InsideContainer value={true}>{children}</InsideContainer>
    </NativeForm>
  )
}

export function Section({
  title = '',
  footer = '',
  children,
  swiftStyle,
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
      {...swiftStyleProps(swiftStyle)}
    >
      <InsideContainer value={true}>{children}</InsideContainer>
    </NativeSection>
  )
}

export function List({
  listStyle = 'automatic',
  children,
  selection,
  onSelectionChange,
  swiftStyle,
  style,
  ...props
}: ListProps) {
  assertSwiftUIValue(
    'ListStyle',
    listStyle,
    Number.parseFloat(String(Platform.Version))
  )
  if (
    selection !== undefined &&
    (!Array.isArray(selection) ||
      selection.some((value) => typeof value !== 'string') ||
      new Set(selection).size !== selection.length)
  )
    throw new Error('Swift.List selection must contain unique string tags')
  assertOneNativeChildren(children, 'Swift.List')
  return (
    <NativeList
      {...props}
      style={viewportStyle(style)}
      listStyle={listStyle}
      selection={JSON.stringify(selection ?? [])}
      selectionIsControlled={selection !== undefined}
      {...swiftStyleProps(swiftStyle)}
      onNativeListSelectionChange={({ nativeEvent }) => {
        const next: unknown = JSON.parse(nativeEvent.selection)
        if (
          !Array.isArray(next) ||
          next.some((value) => typeof value !== 'string') ||
          new Set(next).size !== next.length
        )
          throw new Error('Swift.List received an invalid native selection')
        onSelectionChange?.(next)
      }}
    >
      <InsideContainer value={true}>{children}</InsideContainer>
    </NativeList>
  )
}

export function ScrollView({
  axes = 'vertical',
  showsIndicators = true,
  children,
  swiftStyle,
  style,
  ...props
}: ScrollViewProps) {
  if (!scrollViewAxes.includes(axes))
    throw new Error(
      `Swift.ScrollView axes must be one of ${scrollViewAxes.join(', ')}`
    )
  assertOneNativeChildren(children, 'Swift.ScrollView')
  return (
    <NativeScrollView
      {...props}
      style={viewportStyle(style)}
      axes={axes}
      showsIndicators={showsIndicators}
      {...swiftStyleProps(swiftStyle)}
    >
      <InsideContainer value={true}>{children}</InsideContainer>
    </NativeScrollView>
  )
}

function unitPoint(anchor: UnitPoint): { x: number; y: number } {
  if (typeof anchor === 'string') {
    if (!Object.hasOwn(unitPoints, anchor))
      throw new Error(
        `Swift.ScrollViewProxy.scrollTo anchor must be a UnitPoint: one of ${Object.keys(unitPoints).join(', ')}, or { x, y }`
      )
    return unitPoints[anchor]
  }
  if (
    typeof anchor !== 'object' ||
    !Number.isFinite(anchor.x) ||
    !Number.isFinite(anchor.y)
  )
    throw new Error('Swift.ScrollViewProxy.scrollTo anchor { x, y } must be finite numbers')
  return anchor
}

// the content builder runs with a proxy whose scrollTo reaches the ScrollViewProxy
// SwiftUI gave the native reader. as in SwiftUI, using it while the builder runs is
// an error; call it from an event handler or an effect.
export function ScrollViewReader({ children, style, swiftStyle, ...props }: ScrollViewReaderProps) {
  const host = useRef<ElementRef<typeof NativeScrollViewReader> | null>(null)
  const building = useRef(false)
  const [proxy] = useState<ScrollViewProxy>(() => ({
    scrollTo(id, anchor) {
      if (building.current)
        throw new Error(
          'Swift.ScrollViewProxy.scrollTo cannot run while Swift.ScrollViewReader builds its content; call it from an event handler or effect'
        )
      if (typeof id !== 'string')
        throw new Error('Swift.ScrollViewProxy.scrollTo id must be a string matching a swiftStyle.id')
      const point = anchor == null ? null : unitPoint(anchor)
      if (!host.current)
        throw new Error('Swift.ScrollViewProxy.scrollTo needs its Swift.ScrollViewReader mounted')
      ScrollViewReaderCommands.scrollTo(
        host.current,
        id,
        point !== null,
        point?.x ?? 0,
        point?.y ?? 0
      )
    },
  }))
  if (typeof children !== 'function')
    throw new Error(
      'Swift.ScrollViewReader takes a render function of its proxy; pass (proxy) => content'
    )
  building.current = true
  let content: ReactNode
  try {
    content = children(proxy)
  } finally {
    building.current = false
  }
  assertOneNativeChildren(content, 'Swift.ScrollViewReader')
  return (
    <NativeScrollViewReader {...props} {...swiftStyleProps(swiftStyle)} ref={host} style={viewportStyle(style)}>
      <InsideContainer value={true}>{content}</InsideContainer>
    </NativeScrollViewReader>
  )
}

export function LazyVStack({
  alignment = 'center',
  spacing,
  children,
  style,
  swiftStyle,
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
      {...swiftStyleProps(swiftStyle)}
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
  swiftStyle,
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
      {...swiftStyleProps(swiftStyle)}
      style={[{ alignSelf: 'stretch' }, style]}
      alignment={alignment}
      spacing={spacing ?? -1}
    >
      <InsideContainer value={true}>{children}</InsideContainer>
    </NativeLazyHStack>
  )
}

export function LazyVGrid({
  columns, alignment = 'center', spacing, children, style, swiftStyle, ...props
}: LazyVGridProps) {
  if (!gridHorizontalAlignments.includes(alignment))
    throw new Error('Swift.LazyVGrid alignment must be leading, center, or trailing')
  assertOneNativeChildren(children, 'Swift.LazyVGrid')
  return (
    <NativeLazyVGrid {...props} {...swiftStyleProps(swiftStyle)} style={[{ alignSelf: 'stretch' }, style]}
      columns={gridItems(columns, 'Swift.LazyVGrid')} alignment={alignment}
      spacing={gridSpacing(spacing, 'Swift.LazyVGrid')}>
      <InsideContainer value={true}>{children}</InsideContainer>
    </NativeLazyVGrid>
  )
}

export function LazyHGrid({
  rows, alignment = 'center', spacing, children, style, swiftStyle, ...props
}: LazyHGridProps) {
  if (!gridVerticalAlignments.includes(alignment))
    throw new Error('Swift.LazyHGrid alignment must be a SwiftUI VerticalAlignment')
  assertOneNativeChildren(children, 'Swift.LazyHGrid')
  return (
    <NativeLazyHGrid {...props} {...swiftStyleProps(swiftStyle)} style={[{ alignSelf: 'stretch' }, style]}
      rows={gridItems(rows, 'Swift.LazyHGrid')} alignment={alignment}
      spacing={gridSpacing(spacing, 'Swift.LazyHGrid')}>
      <InsideContainer value={true}>{children}</InsideContainer>
    </NativeLazyHGrid>
  )
}

export function Grid({
  alignment = 'center', horizontalSpacing, verticalSpacing, children, style, swiftStyle, ...props
}: GridProps) {
  if (!gridAlignments.includes(alignment))
    throw new Error('Swift.Grid alignment must be a SwiftUI Alignment')
  assertOneNativeChildren(children, 'Swift.Grid')
  return (
    <NativeGrid {...props} {...swiftStyleProps(swiftStyle)} style={[{ alignSelf: 'stretch' }, style]}
      alignment={alignment}
      horizontalSpacing={gridSpacing(horizontalSpacing, 'Swift.Grid horizontal')}
      verticalSpacing={gridSpacing(verticalSpacing, 'Swift.Grid vertical')}>
      <InsideContainer value={true}>{children}</InsideContainer>
    </NativeGrid>
  )
}

export function GridRow({ alignment, children, style, swiftStyle, ...props }: GridRowProps) {
  if (alignment !== undefined && !gridVerticalAlignments.includes(alignment))
    throw new Error('Swift.GridRow alignment must be a SwiftUI VerticalAlignment')
  assertOneNativeChildren(children, 'Swift.GridRow')
  return (
    <NativeGridRow {...props} {...swiftStyleProps(swiftStyle)} style={[{ alignSelf: 'stretch' }, style]}
      alignment={alignment ?? ''}>
      <InsideContainer value={true}>{children}</InsideContainer>
    </NativeGridRow>
  )
}

export function LabeledContent({
  label,
  value,
  systemImage,
  children,
  style,
  swiftStyle,
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
      {...swiftStyleProps(swiftStyle)}
      style={[{ alignSelf: 'stretch' }, style]}
      label={content.label}
      value={content.value}
      systemImage={content.systemImage}
    >
      <InsideContainer value={true}>{children}</InsideContainer>
    </NativeLabeledContent>
  )
}

export function GroupBox({ label, children, style, swiftStyle, ...props }: GroupBoxProps) {
  if (label !== undefined && typeof label !== 'string')
    throw new Error('GroupBox label must be a string when provided')
  assertOneNativeChildren(children, 'Swift.GroupBox')
  return (
    <NativeGroupBox {...props} {...swiftStyleProps(swiftStyle)} label={label ?? ''} style={[{ alignSelf: 'stretch' }, style]}>
      <InsideContainer value={true}>{children}</InsideContainer>
    </NativeGroupBox>
  )
}

export function ViewThatFits({ axes = 'both', children, style, swiftStyle, ...props }: ViewThatFitsProps) {
  if (Number.parseFloat(String(Platform.Version)) < 16)
    throw new Error('Swift.ViewThatFits requires iOS 16 or newer')
  if (!viewThatFitsAxes.includes(axes))
    throw new Error(`Swift.ViewThatFits axes must be one of ${viewThatFitsAxes.join(', ')}`)
  assertOneNativeChildren(children, 'Swift.ViewThatFits')
  assertNoGreedyContainer(children, 'Swift.ViewThatFits')
  return (
    <NativeViewThatFits {...props} {...swiftStyleProps(swiftStyle)} axes={axes} style={[{ alignSelf: 'stretch' }, style]}>
      <InsideContainer value={true}>{children}</InsideContainer>
    </NativeViewThatFits>
  )
}

// a button renders text from its label props or a custom label view from its
// children, never both: children are the whole Button(action:) label, so any text
// label content alongside them is ambiguous and fails here instead of in SwiftUI.
export function Button({
  onPress,
  label = '',
  disabled = false,
  subtitle = '',
  systemImage = '',
  buttonRole = '',
  buttonStyle = 'automatic',
  disclosureIndicator = false,
  children,
  swiftStyle,
  style,
  ...props
}: ButtonProps) {
  if (typeof label !== 'string') throw new Error('Button label must be a string')
  const hasChildren = Children.toArray(children).length > 0
  if (hasChildren && (label !== '' || systemImage !== '' || subtitle !== ''))
    throw new Error('Swift.Button takes either a label or children')
  if (!label && !systemImage && !hasChildren)
    throw new Error('Button needs a label, a systemImage, or both')
  if (buttonRole)
    assertSwiftUIValue(
      'ButtonRole',
      buttonRole,
      Number.parseFloat(String(Platform.Version))
    )
  assertSwiftUIValue(
    'PrimitiveButtonStyle',
    buttonStyle,
    Number.parseFloat(String(Platform.Version))
  )
  assertOneNativeChildren(children, 'Swift.Button')
  return (
    <NativeButton
      {...props}
      style={style}
      {...swiftStyleProps(swiftStyle)}
      label={label}
      disabled={disabled}
      subtitle={subtitle}
      systemImage={systemImage}
      buttonRole={buttonRole}
      buttonStyle={buttonStyle}
      disclosureIndicator={disclosureIndicator}
      onNativeButtonPress={({ nativeEvent }) => onPress?.()}
    >
      <InsideContainer value={true}>{children}</InsideContainer>
    </NativeButton>
  )
}

export function Glass({
  material,
  glassEffect,
  interactive = false,
  shape,
  cornerRadius,
  tint,
  colorScheme,
  children,
  style,
  swiftStyle,
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
  if (colorScheme)
    assertSwiftUIValue('ColorScheme', colorScheme, Number.parseFloat(String(Platform.Version)))
  assertOneNativeChildren(children, 'Swift.Glass')
  return (
    <NativeGlass
      {...props}
      {...swiftStyleProps(swiftStyle)}
      style={[{ alignSelf: 'stretch' }, style]}
      material={material ?? ''}
      glassEffect={glassEffect ?? (material ? '' : 'regular')}
      interactive={interactive}
      shape={shape ?? ''}
      cornerRadius={cornerRadius ?? -1}
      tint={tint}
      colorScheme={colorScheme ?? ''}
    >
      <InsideContainer value={true}>{children}</InsideContainer>
    </NativeGlass>
  )
}

export function GlassEffectContainer({ spacing, children, style, swiftStyle, ...props }: GlassEffectContainerProps) {
  if (Number.parseFloat(String(Platform.Version)) < 26)
    throw new Error('Swift.GlassEffectContainer requires iOS 26 or newer')
  if (spacing !== undefined && !Number.isFinite(spacing))
    throw new Error('Swift.GlassEffectContainer spacing must be finite')
  assertOneNativeChildren(children, 'Swift.GlassEffectContainer')
  return (
    <NativeGlassEffectContainer
      {...props}
      {...swiftStyleProps(swiftStyle)}
      style={[{ alignSelf: 'stretch' }, style]}
      spacing={spacing ?? 0}
      hasSpacing={spacing !== undefined}
    >
      <InsideContainer value={true}>{children}</InsideContainer>
    </NativeGlassEffectContainer>
  )
}

// the content builder runs only after SwiftUI supplies real geometry. native
// transport keeps frames as data; the public proxy preserves the SDK method.
type GeometrySnapshot = {
  size: GeometryProxy['size']
  safeAreaInsets: GeometryProxy['safeAreaInsets']
  globalFrame: ReturnType<GeometryProxy['frame']>
  localFrame: ReturnType<GeometryProxy['frame']>
}

function geometryNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function sameGeometry(a: GeometrySnapshot | null, b: GeometrySnapshot): boolean {
  if (!a) return false
  return (
    a.size.width === b.size.width && a.size.height === b.size.height &&
    a.globalFrame.x === b.globalFrame.x && a.globalFrame.y === b.globalFrame.y &&
    a.globalFrame.width === b.globalFrame.width && a.globalFrame.height === b.globalFrame.height &&
    a.localFrame.x === b.localFrame.x && a.localFrame.y === b.localFrame.y &&
    a.localFrame.width === b.localFrame.width && a.localFrame.height === b.localFrame.height &&
    a.safeAreaInsets.top === b.safeAreaInsets.top &&
    a.safeAreaInsets.leading === b.safeAreaInsets.leading &&
    a.safeAreaInsets.bottom === b.safeAreaInsets.bottom &&
    a.safeAreaInsets.trailing === b.safeAreaInsets.trailing
  )
}

export function GeometryReader({ children, style, swiftStyle, ...props }: GeometryReaderProps) {
  const [geometry, setGeometry] = useState<GeometryProxy | null>(null)
  const latest = useRef<GeometrySnapshot | null>(null)
  if (typeof children !== 'function')
    throw new Error('Swift.GeometryReader takes a render function of its geometry; pass (geometry) => content')
  const content = geometry === null ? null : children(geometry)
  assertOneNativeChildren(content, 'Swift.GeometryReader')
  return (
    <NativeGeometryReader
      {...props}
      {...swiftStyleProps(swiftStyle)}
      style={[{ alignSelf: 'stretch' }, style]}
      onNativeGeometryReaderChange={({ nativeEvent }) => {
        const event = nativeEvent as Record<string, unknown> | null | undefined
        const fields = ['x', 'y', 'width', 'height', 'localX', 'localY', 'localWidth', 'localHeight',
          'sizeWidth', 'sizeHeight', 'safeAreaTop', 'safeAreaLeading', 'safeAreaBottom', 'safeAreaTrailing'] as const
        for (const field of fields) {
          if (geometryNumber(event?.[field]) === undefined)
            throw new Error('Swift.GeometryReader emitted an invalid geometry')
        }
        const values = event as Record<(typeof fields)[number], number>
        const next: GeometrySnapshot = {
          size: { width: values.sizeWidth, height: values.sizeHeight },
          safeAreaInsets: { top: values.safeAreaTop, leading: values.safeAreaLeading,
            bottom: values.safeAreaBottom, trailing: values.safeAreaTrailing },
          globalFrame: { x: values.x, y: values.y, width: values.width, height: values.height },
          localFrame: { x: values.localX, y: values.localY, width: values.localWidth, height: values.localHeight },
        }
        if (sameGeometry(latest.current, next)) return
        latest.current = next
        setGeometry({
          size: next.size,
          safeAreaInsets: next.safeAreaInsets,
          frame(coordinateSpace) {
            if (coordinateSpace === 'global') return { ...next.globalFrame }
            if (coordinateSpace === 'local') return { ...next.localFrame }
            throw new Error('Swift.GeometryProxy.frame supports global and local coordinate spaces; named spaces are not yet bound')
          },
        })
      }}
    >
      <InsideContainer value={true}>{content}</InsideContainer>
    </NativeGeometryReader>
  )
}

export function ControlGroup({
  label = '',
  systemImage = '',
  controlGroupStyle = 'automatic',
  children,
  style,
  swiftStyle,
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
      {...swiftStyleProps(swiftStyle)}
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
  swiftStyle,
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
      {...swiftStyleProps(swiftStyle)}
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

export function Divider({ children, style, swiftStyle, ...props }: DividerProps) {
  const inside = useContext(InsideContainer)
  if (!inside) throw new Error(`Swift.Divider must be a child of ${containers}`)
  if (Children.toArray(children).length > 0)
    throw new Error('Swift.Divider holds no content')
  return <NativeDivider {...props} {...swiftStyleProps(swiftStyle)} style={style} />
}

export function Link({
  destination,
  label = '',
  children,
  style,
  swiftStyle,
  ...props
}: LinkProps) {
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
      {...swiftStyleProps(swiftStyle)}
      style={[{ alignSelf: 'stretch' }, style]}
      destination={destination}
      label={label}
    >
      <InsideContainer value={true}>{children}</InsideContainer>
    </NativeLink>
  )
}

export function Group({ children, style, swiftStyle, ...props }: GroupProps) {
  assertOneNativeChildren(children, 'Swift.Group')
  return (
    <NativeGroup {...props} {...swiftStyleProps(swiftStyle)} style={[{ alignSelf: 'stretch' }, style]}>
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
    <NativeOverlay {...props} style={[{ alignSelf: 'stretch' }, style]} alignment={alignment} slotName="" slotValues="[]">
      <InsideContainer value={true}>{children}</InsideContainer>
    </NativeOverlay>
  )
}

export const Overlay = Object.assign(OverlayFn, { Content: OverlayContent })

function ViewSlotFn({ name, options, children, style, ...props }: ViewSlotProps) {
  if (!Object.hasOwn(viewSlotAvailability, name))
    throw new Error(`unknown Swift.ViewSlot: ${name}`)
  if (Number.parseFloat(String(Platform.Version)) < viewSlotAvailability[name])
    throw new Error(`Swift.ViewSlot ${name} requires iOS ${viewSlotAvailability[name]} or later`)
  const markers = Children.toArray(children).filter(
    (child) => isValidElement(child) && child.type === OverlayContent
  )
  if (markers.length !== 1)
    throw new Error('Swift.ViewSlot takes one ViewSlot.Content child')
  assertOneNativeChildren(children, 'Swift.ViewSlot')
  const preferenceEvent = Object.hasOwn(viewSlotEvents, name) ? viewSlotEvents[name] : undefined
  if (preferenceEvent && typeof (options as { onValue?: unknown } | undefined)?.onValue !== 'function')
    throw new Error(`Swift.ViewSlot ${name}.onValue must be a callback`)
  const values = viewSlotArguments[name].map((argument) => {
    const value = (options as Record<string, unknown> | undefined)?.[argument.field]
    if (argument.kind === 'bindingBoolean' || argument.kind === 'bindingString') {
      if (typeof value !== 'object' || value === null ||
        typeof (value as { value?: unknown }).value !== (argument.kind === 'bindingBoolean' ? 'boolean' : 'string') ||
        typeof (value as { onChange?: unknown }).onChange !== 'function')
        throw new Error(`Swift.ViewSlot ${name}.${argument.field} must be a ${argument.kind === 'bindingBoolean' ? 'boolean' : 'string'} binding`)
      return String((value as { value: boolean | string }).value)
    }
    if (argument.kind === 'boolean') {
      if (typeof value !== 'boolean')
        throw new Error(`Swift.ViewSlot ${name}.${argument.field} must be a boolean`)
      return String(value)
    }
    if (argument.kind === 'string') {
      if (typeof value !== 'string')
        throw new Error(`Swift.ViewSlot ${name}.${argument.field} must be a string`)
      return value
    }
    if (typeof value !== 'string' || !Object.hasOwn(argument.cases, value))
      throw new Error(`Swift.ViewSlot ${name}.${argument.field} must be a declared SDK case`)
    if (Number.parseFloat(String(Platform.Version)) < (argument.cases as Record<string, number>)[value])
      throw new Error(`Swift.ViewSlot ${name}.${argument.field}=${value} is unavailable on this iOS version`)
    return value
  })
  return (
    <NativeOverlay
      {...props}
      style={[{ alignSelf: 'stretch' }, style]}
      alignment="center"
      slotName={name}
      slotValues={JSON.stringify(values)}
      onNativeSDKEvent={({ nativeEvent }) => {
        if (nativeEvent.name !== name) throw new Error(`Swift.ViewSlot ${name} emitted an invalid binding event`)
        if (preferenceEvent) {
          let value: unknown
          try { value = JSON.parse(nativeEvent.value) }
          catch { throw new Error(`Swift.ViewSlot ${name} emitted an invalid preference value`) }
          if (!validSDKEventValue(value, preferenceEvent))
            throw new Error(`Swift.ViewSlot ${name} emitted an invalid preference value`)
          ;(options as { onValue: (value: unknown) => void }).onValue(value)
          return
        }
        const argument = viewSlotArguments[name].find((item) => item.kind === 'bindingBoolean' || item.kind === 'bindingString')
        if (!argument) throw new Error(`Swift.ViewSlot ${name} emitted an unexpected event`)
        if (argument.kind === 'bindingBoolean') {
          if (nativeEvent.value !== 'true' && nativeEvent.value !== 'false')
            throw new Error(`Swift.ViewSlot ${name} emitted an invalid boolean binding`)
          const binding = (options as Record<string, { onChange: (value: boolean) => void }>)[argument.field]
          binding.onChange(nativeEvent.value === 'true')
        } else {
          const binding = (options as Record<string, { onChange: (value: string) => void }>)[argument.field]
          binding.onChange(nativeEvent.value)
        }
      }}
    >
      <InsideContainer value={true}>{children}</InsideContainer>
    </NativeOverlay>
  )
}

export const ViewSlot = Object.assign(ViewSlotFn, { Content: OverlayContent })

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
    isValidElement<SwipeActionsActionsProps>(child) &&
    child.type === SwipeActionsActions
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
