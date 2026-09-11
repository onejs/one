import { Children, isValidElement } from 'react'
import NativeForm from './specs/OneNativeFormNativeComponent'
import NativeHost from './specs/OneNativeHostNativeComponent'
import NativeSection from './specs/OneNativeSectionNativeComponent'
import {
  hostAlignments,
  hostAxes,
  type FormProps,
  type HostProps,
  type SectionProps,
} from './generated/containerTypes'

export function Host({
  axis = 'vertical',
  spacing = 0,
  alignment = 'leading',
  children,
  style,
  ...props
}: HostProps) {
  if (!hostAxes.includes(axis))
    throw new Error(`Swift.Host axis must be one of ${hostAxes.join(', ')}`)
  if (!hostAlignments.includes(alignment))
    throw new Error(`Swift.Host alignment must be one of ${hostAlignments.join(', ')}`)
  if (!Number.isFinite(spacing) || spacing < 0)
    throw new Error('Swift.Host spacing must be a non-negative number')
  // a SwiftUI Form has no ideal height, so a host measures one as zero and it renders
  // nothing at all. that failure is silent, so reject it where it is written.
  for (const child of Children.toArray(children))
    if (isValidElement(child) && child.type === Form)
      throw new Error('Swift.Form cannot be a child of Swift.Host; give the Form its own box')
  // the host reports the height SwiftUI measured, so Yoga must not be given one.
  return (
    <NativeHost
      {...props}
      style={[{ alignSelf: 'stretch' }, style]}
      axis={axis}
      spacing={spacing}
      alignment={alignment}
    >
      {children}
    </NativeHost>
  )
}

// a SwiftUI Form is height-greedy and has no ideal height, so it fills the box React
// Native gives it. Give it a height or put it in a flex parent.
export function Form({ children, style, ...props }: FormProps) {
  return (
    <NativeForm {...props} style={[{ flex: 1 }, style]}>
      {children}
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
      {children}
    </NativeSection>
  )
}
