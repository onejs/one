import { Platform, requireNativeComponent, type ViewProps } from 'react-native'

import type {
  ZoomTransitionSourceProps,
  ZoomTransitionEnablerProps,
  ZoomTransitionAlignmentRectDetectorProps,
} from './types'

export type {
  ZoomTransitionSourceProps,
  ZoomTransitionEnablerProps,
  ZoomTransitionAlignmentRectDetectorProps,
  DismissalBoundsRect,
  SourceAlignmentRect,
} from './types'

const isAvailable = Platform.OS === 'ios' && !Platform.isTV

const ZoomEnablerNative = isAvailable
  ? requireNativeComponent<
      ViewProps & { zoomTransitionSourceIdentifier: string; dismissalBoundsRect?: any }
    >('VxrnZoomEnabler')
  : null

export function ZoomTransitionEnabler(props: ZoomTransitionEnablerProps) {
  if (!ZoomEnablerNative) return null
  return (
    <ZoomEnablerNative
      {...props}
      collapsable={false}
      style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
    />
  )
}

const ZoomSourceNative = isAvailable
  ? requireNativeComponent<ViewProps & ZoomTransitionSourceProps>('VxrnZoomSource')
  : null

export function ZoomTransitionSource(props: ZoomTransitionSourceProps) {
  if (!ZoomSourceNative) return null
  return <ZoomSourceNative {...props} collapsable={false} style={{ display: 'flex' }} />
}

const ZoomAlignmentNative = isAvailable
  ? requireNativeComponent<ViewProps & { identifier: string }>('VxrnZoomAlignment')
  : null

export function ZoomTransitionAlignmentRectDetector(
  props: ZoomTransitionAlignmentRectDetectorProps
) {
  if (!ZoomAlignmentNative) return null
  return (
    <ZoomAlignmentNative {...props} collapsable={false} style={{ display: 'flex' }} />
  )
}
