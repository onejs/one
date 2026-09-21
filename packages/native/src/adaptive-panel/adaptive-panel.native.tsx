import { Platform } from 'react-native'
import { useControlled } from '../controlled'
import NativeContent from '../specs/OneNativeAdaptivePanelContentNativeComponent'
import NativePanel from '../specs/OneNativeAdaptivePanelNativeComponent'
import type {
  AdaptivePanelDetent,
  AdaptivePanelFrame,
  AdaptivePanelPlacement,
  AdaptivePanelProps,
} from './types'

const DEFAULT_DETENTS = ['large'] as const
const DEFAULT_REGULAR_WIDTH = 320
type NativeDetent = { type: string; value: number }

function nativeDetent(detent: AdaptivePanelDetent): NativeDetent {
  if (detent === 'medium' || detent === 'large') return { type: detent, value: 0 }
  if (typeof detent !== 'object' || detent === null || Object.keys(detent).length !== 1)
    throw new Error('Invalid adaptive panel detent')
  if (
    'fraction' in detent &&
    Number.isFinite(detent.fraction) &&
    detent.fraction > 0 &&
    detent.fraction <= 1
  )
    return { type: 'fraction', value: detent.fraction }
  if ('height' in detent && Number.isFinite(detent.height) && detent.height > 0)
    return { type: 'height', value: detent.height }
  throw new Error(
    'Adaptive panel detent must be medium, large, a fraction in (0, 1], or a positive height'
  )
}

function publicDetent({ type, value }: NativeDetent): AdaptivePanelDetent {
  if (type === 'medium' || type === 'large') return type
  if (type === 'fraction') return { fraction: value }
  if (type === 'height') return { height: value }
  throw new Error(`Unknown native adaptive panel detent: ${type}`)
}

function sameDetent(a: NativeDetent, b: NativeDetent) {
  return a.type === b.type && a.value === b.value
}

const placements: readonly AdaptivePanelPlacement[] = ['hidden', 'compact', 'regular']

function publicLayout(event: {
  placement: string
  frameX: number
  frameY: number
  frameWidth: number
  frameHeight: number
}): { placement: AdaptivePanelPlacement; frame: AdaptivePanelFrame } {
  if (!placements.includes(event.placement as AdaptivePanelPlacement))
    throw new Error(`Unknown native adaptive panel placement: ${event.placement}`)
  for (const [key, value] of Object.entries(event)) {
    if (key === 'placement') continue
    if (typeof value !== 'number' || !Number.isFinite(value))
      throw new Error(`Invalid native adaptive panel frame: ${key}`)
  }
  return {
    placement: event.placement as AdaptivePanelPlacement,
    frame: {
      x: event.frameX,
      y: event.frameY,
      width: event.frameWidth,
      height: event.frameHeight,
    },
  }
}

export function AdaptivePanel({
  open,
  onOpenChange,
  revision = 0,
  compactDetents,
  selectedDetent,
  onSelectedDetentChange,
  detentRevision = 0,
  regularWidth = DEFAULT_REGULAR_WIDTH,
  onPlacementChange,
  onFrameChange,
  children,
  style,
  ...props
}: AdaptivePanelProps) {
  if (typeof open !== 'boolean')
    throw new Error('One.UI.AdaptivePanel open must be a boolean')
  const requestedDetents = compactDetents ?? DEFAULT_DETENTS
  if (!Array.isArray(requestedDetents) || !requestedDetents.length)
    throw new Error('One.UI.AdaptivePanel requires at least one compact detent')
  const detents = requestedDetents.map(nativeDetent)
  if (
    new Set(detents.map(({ type, value }) => `${type}:${value}`)).size !== detents.length
  )
    throw new Error('One.UI.AdaptivePanel compact detents must be unique')
  if ((selectedDetent === undefined) !== (onSelectedDetentChange === undefined))
    throw new Error(
      'One.UI.AdaptivePanel selectedDetent and onSelectedDetentChange must be provided together'
    )
  const nativeSelection = selectedDetent ? nativeDetent(selectedDetent) : null
  if (nativeSelection && !detents.some((detent) => sameDetent(detent, nativeSelection)))
    throw new Error('One.UI.AdaptivePanel selectedDetent must be in compactDetents')
  if (!Number.isFinite(regularWidth) || regularWidth <= 0)
    throw new Error('One.UI.AdaptivePanel regularWidth must be a positive number')
  const controlled = useControlled<{
    open: boolean
    eventCount: number
    revision: number
  }>((event) => onOpenChange(event.open), revision)
  const controlledDetent = useControlled<{
    type: string
    value: number
    eventCount: number
    revision: number
  }>((event) => onSelectedDetentChange?.(publicDetent(event)), detentRevision)
  const baseStyle =
    Platform.OS === 'android'
      ? {
          position: 'absolute' as const,
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          backgroundColor: 'transparent',
        }
      : { position: 'absolute' as const, width: 0, height: 0 }
  return (
    <NativePanel
      {...props}
      style={[baseStyle, style]}
      collapsable={false}
      pointerEvents={Platform.OS === 'android' ? 'box-none' : undefined}
      open={open}
      revision={revision}
      acknowledgedEvent={controlled.acknowledgedEvent}
      compactDetents={detents}
      selectedDetentType={nativeSelection?.type ?? ''}
      selectedDetentValue={nativeSelection?.value ?? 0}
      acknowledgedDetentEvent={controlledDetent.acknowledgedEvent}
      detentRevision={detentRevision}
      regularWidth={regularWidth}
      onNativeAdaptivePanelOpenChange={({ nativeEvent }) =>
        controlled.onNativeChange(nativeEvent)
      }
      onNativeAdaptivePanelDetentChange={({ nativeEvent }) =>
        controlledDetent.onNativeChange(nativeEvent)
      }
      onNativeAdaptivePanelLayoutChange={({ nativeEvent }) => {
        const { placement, frame } = publicLayout(nativeEvent)
        onPlacementChange?.(placement)
        onFrameChange?.(frame)
      }}
    >
      <NativeContent
        collapsable={false}
        style={{ position: 'absolute', left: 0, top: 0 }}
      >
        {children}
      </NativeContent>
    </NativePanel>
  )
}
