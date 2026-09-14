import {
  Children,
  createContext,
  isValidElement,
  useContext,
  type ReactNode,
} from 'react'
import { Platform } from 'react-native'
import NativeContainerSlot from './specs/OneNativeContainerSlotNativeComponent'
import NativeForm from './specs/OneNativeFormNativeComponent'
import NativeGlass from './specs/OneNativeGlassNativeComponent'
import NativeHost from './specs/OneNativeHostNativeComponent'
import NativeLabeledContent from './specs/OneNativeLabeledContentNativeComponent'
import NativeSection from './specs/OneNativeSectionNativeComponent'
import NativeSpacer from './specs/OneNativeSpacerNativeComponent'
import NativeZStack from './specs/OneNativeZStackNativeComponent'
import { assertSwiftUIValue } from './generated/swiftui'
import { labeledContentProps } from './labeledContent'
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

// a slot only works where SwiftUI proposes its box, so containers mark their children
// and a slot marks its own React Native subtree as outside again.
export const InsideContainer = createContext(false)

const containers =
  'Swift.Host, Swift.HStack, Swift.VStack, Swift.ZStack, Swift.Form, Swift.Section, or Swift.Glass'

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

function assertNoForm(children: ReactNode, owner: string) {
  for (const child of Children.toArray(children))
    if (isValidElement(child) && child.type === Form)
      throw new Error(
        `Swift.Form cannot be a child of ${owner}; give the Form its own box`
      )
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
  assertNoForm(children, name)
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
  assertNoForm(children, 'Swift.ZStack')
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

export function Form({
  children,
  style,
  colorScheme,
  dynamicTypeSize,
  locale,
  tint,
  isEnabled,
  ...props
}: FormProps) {
  return (
    <NativeForm
      {...props}
      {...nativeEnvironmentProps({
        colorScheme,
        dynamicTypeSize,
        locale,
        tint,
        isEnabled,
      })}
      style={[{ flex: 1 }, style]}
    >
      <InsideContainer value={true}>{children}</InsideContainer>
    </NativeForm>
  )
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
  return (
    <NativeSection {...props} style={[{ flex: 1 }, style]} title={title} footer={footer}>
      <InsideContainer value={true}>{children}</InsideContainer>
    </NativeSection>
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
  cornerRadius,
  tint,
  children,
  style,
  ...props
}: GlassProps) {
  return (
    <NativeGlass
      {...props}
      style={[{ alignSelf: 'stretch' }, style]}
      material={material ?? ''}
      glassEffect={glassEffect ?? ''}
      cornerRadius={cornerRadius ?? -1}
      tint={tint}
    >
      <InsideContainer value={true}>{children}</InsideContainer>
    </NativeGlass>
  )
}

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
