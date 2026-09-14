import {
  Children,
  createContext,
  isValidElement,
  useContext,
  type ReactNode,
} from 'react'
import NativeContainerSlot from './specs/OneNativeContainerSlotNativeComponent'
import NativeForm from './specs/OneNativeFormNativeComponent'
import NativeGlass from './specs/OneNativeGlassNativeComponent'
import NativeHost from './specs/OneNativeHostNativeComponent'
import NativeLabeledContent from './specs/OneNativeLabeledContentNativeComponent'
import NativeSection from './specs/OneNativeSectionNativeComponent'
import NativeSpacer from './specs/OneNativeSpacerNativeComponent'
import NativeZStack from './specs/OneNativeZStackNativeComponent'
import { labeledContentProps } from './labeledContent'
import {
  hostAlignments,
  hostAxes,
  zStackAlignments,
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

// a slot and a spacer both need a container to sit in, so both name the same set.
const containers =
  'Swift.Host, Swift.HStack, Swift.VStack, Swift.ZStack, Swift.Form, Swift.Section, or Swift.Glass'

// a SwiftUI Form has no ideal height, so a container that measures what it holds reads
// zero for one and it renders nothing at all. that failure is silent, so reject it where
// it is written.
function assertNoForm(children: ReactNode, owner: string) {
  for (const child of Children.toArray(children))
    if (isValidElement(child) && child.type === Form)
      throw new Error(
        `Swift.Form cannot be a child of ${owner}; give the Form its own box`
      )
}

type HostStackProps = HostProps & { name: string; axis: HostAxis }

// HStack and VStack are this with the axis fixed, so all three take one path through
// validation and measurement, and each message names what was actually written.
function HostStack({
  name,
  axis,
  spacing = 0,
  alignment = 'leading',
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
  // the host reports the height SwiftUI measured, so Yoga must not be given one.
  return (
    <NativeHost
      {...props}
      style={[{ alignSelf: 'stretch' }, style]}
      axis={axis}
      spacing={spacing}
      alignment={alignment}
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

// SwiftUI sizes a ZStack to its largest child and places the rest against the alignment,
// so a background and the content over it are one box rather than two laid out in turn.
export function ZStack({ alignment = 'center', children, style, ...props }: ZStackProps) {
  if (!zStackAlignments.includes(alignment))
    throw new Error(
      `Swift.ZStack alignment must be one of ${zStackAlignments.join(', ')}`
    )
  assertNoForm(children, 'Swift.ZStack')
  // measured from SwiftUI like a host, so it reports its own height and takes no other.
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

// a spacer takes the free space its stack offers, so it has nothing to say outside one.
export function Spacer({ minLength = 0, style, ...props }: SpacerProps) {
  const inside = useContext(InsideContainer)
  if (!inside) throw new Error(`Swift.Spacer must be a child of ${containers}`)
  if (!Number.isFinite(minLength) || minLength < 0)
    throw new Error('Swift.Spacer minLength must be a non-negative number')
  return <NativeSpacer {...props} style={style} minLength={minLength} />
}

// a SwiftUI Form is height-greedy and has no ideal height, so it fills the box React
// Native gives it. Give it a height or put it in a flex parent.
export function Form({ children, style, ...props }: FormProps) {
  return (
    <NativeForm {...props} style={[{ flex: 1 }, style]}>
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

// a row of a form, a section, or a host. the content is the `value` string or composed
// children, so the row carries a plain value without a wrapper and still takes controls.
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
  // the row reports the height SwiftUI measured, so Yoga must not be given one.
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

// a glass surface takes the box React Native gave it, so give it a height or a flex parent.
// the radius is optional: left out, the glass keeps the shape the system picks for its size.
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
      // an empty surface name and a negative radius are how the native side hears "unset".
      material={material ?? ''}
      glassEffect={glassEffect ?? ''}
      cornerRadius={cornerRadius ?? -1}
      tint={tint}
    >
      <InsideContainer value={true}>{children}</InsideContainer>
    </NativeGlass>
  )
}

// a slot carries a React Native subtree into the SwiftUI tree. SwiftUI proposes the box
// from `height` and the shared slot shadow node writes it back to Yoga, so the subtree
// lays out inside the box SwiftUI gave it.
export function Slot({ height, width = 0, children, style, ...props }: SlotProps) {
  const inside = useContext(InsideContainer)
  if (!inside) throw new Error(`Swift.Slot must be a child of ${containers}`)
  if (!Number.isFinite(height) || height <= 0)
    throw new Error('Swift.Slot height must be a positive number')
  // a vertical container offers its full width; a horizontal one offers none, so a slot
  // in a horizontal host takes an explicit width.
  if (!Number.isFinite(width) || width < 0)
    throw new Error('Swift.Slot width must be a non-negative number')
  return (
    <NativeContainerSlot {...props} style={style} height={height} width={width}>
      <InsideContainer value={false}>{children}</InsideContainer>
    </NativeContainerSlot>
  )
}
