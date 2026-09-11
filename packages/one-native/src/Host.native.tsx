import NativeHost from './specs/OneNativeHostNativeComponent'
import {
  hostAlignments,
  hostAxes,
  type HostProps,
} from './generated/hostTypes'

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
  // the host reports the height SwiftUI measured, so Yoga must not be given one.
  return (
    <NativeHost {...props} style={[{ alignSelf: 'stretch' }, style]} axis={axis} spacing={spacing} alignment={alignment}>
      {children}
    </NativeHost>
  )
}
