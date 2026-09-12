import { Platform } from 'react-native'
import { useControlled } from './controlled'
import NativeSheet from './specs/OneNativeSheetNativeComponent'
import NativeContent from './specs/OneNativeSheetContentNativeComponent'
import { assertSwiftUIValue } from './generated/swiftui'
import type { SheetProps } from './generated/sheetTypes'
import type { PresentationDetent } from './generated/sheetTypes'

const DEFAULT_DETENTS = ['large'] as const
type NativeDetent = { type: string; value: number }

function nativeDetent(detent: PresentationDetent): NativeDetent {
  if (detent === 'medium' || detent === 'large') return { type: detent, value: 0 }
  if (typeof detent !== 'object' || detent === null || Object.keys(detent).length !== 1)
    throw new Error('Invalid presentation detent')
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
    'Presentation detent must be medium, large, a fraction in (0, 1], or a positive height'
  )
}

function publicDetent({ type, value }: NativeDetent): PresentationDetent {
  if (type === 'medium' || type === 'large') return type
  if (type === 'fraction') return { fraction: value }
  if (type === 'height') return { height: value }
  throw new Error(`Unknown native presentation detent: ${type}`)
}

function sameDetent(a: NativeDetent, b: NativeDetent) {
  return a.type === b.type && a.value === b.value
}

export function Sheet({
  isPresented,
  onIsPresentedChange,
  onDismiss,
  revision = 0,
  presentationDetents,
  fitToContents = false,
  selectedDetent,
  onSelectedDetentChange,
  detentRevision = 0,
  presentationDragIndicator = 'automatic',
  interactiveDismissDisabled = false,
  presentationBackground,
  presentationBackgroundInteraction = 'automatic',
  presentationContentInteraction = 'automatic',
  presentationSizing = 'automatic',
  children,
  style,
  ...props
}: SheetProps) {
  if (typeof isPresented !== 'boolean')
    throw new Error('Swift.Sheet isPresented must be a boolean')
  const requestedDetents = presentationDetents ?? DEFAULT_DETENTS
  if (!Array.isArray(requestedDetents) || !requestedDetents.length)
    throw new Error('Swift.Sheet requires at least one presentation detent')
  const detents = requestedDetents.map(nativeDetent)
  if (
    new Set(detents.map(({ type, value }) => `${type}:${value}`)).size !== detents.length
  )
    throw new Error('Swift.Sheet presentation detents must be unique')
  if ((selectedDetent === undefined) !== (onSelectedDetentChange === undefined))
    throw new Error(
      'Swift.Sheet selectedDetent and onSelectedDetentChange must be provided together'
    )
  if (fitToContents && selectedDetent !== undefined)
    throw new Error('Swift.Sheet fitToContents cannot be combined with selectedDetent')
  const nativeSelection = selectedDetent ? nativeDetent(selectedDetent) : null
  if (nativeSelection && !detents.some((detent) => sameDetent(detent, nativeSelection)))
    throw new Error('Swift.Sheet selectedDetent must be in presentationDetents')
  const backgroundInteraction = (() => {
    if (typeof presentationBackgroundInteraction === 'string') {
      if (
        !['automatic', 'enabled', 'disabled'].includes(presentationBackgroundInteraction)
      )
        throw new Error('Invalid Swift.Sheet presentationBackgroundInteraction')
      return {
        mode: presentationBackgroundInteraction,
        detent: { type: 'large', value: 0 },
      }
    }
    if (
      typeof presentationBackgroundInteraction !== 'object' ||
      presentationBackgroundInteraction === null ||
      !('enabledUpThrough' in presentationBackgroundInteraction)
    )
      throw new Error('Invalid Swift.Sheet presentationBackgroundInteraction')
    const detent = nativeDetent(presentationBackgroundInteraction.enabledUpThrough)
    if (fitToContents)
      throw new Error(
        'Swift.Sheet fitToContents cannot use an enabledUpThrough background interaction'
      )
    if (!detents.some((candidate) => sameDetent(candidate, detent)))
      throw new Error(
        'Swift.Sheet presentationBackgroundInteraction detent must be in presentationDetents'
      )
    return { mode: 'enabledUpThrough', detent }
  })()
  if (!['automatic', 'fitted', 'form', 'page'].includes(presentationSizing))
    throw new Error('Invalid Swift.Sheet presentationSizing')
  assertSwiftUIValue(
    'Visibility',
    presentationDragIndicator,
    Number.parseFloat(String(Platform.Version))
  )
  assertSwiftUIValue(
    'PresentationContentInteraction',
    presentationContentInteraction,
    Number.parseFloat(String(Platform.Version))
  )
  const controlled = useControlled<{
    isPresented: boolean
    eventCount: number
    revision: number
  }>((event) => onIsPresentedChange(event.isPresented), revision)
  const controlledDetent = useControlled<{
    type: string
    value: number
    eventCount: number
    revision: number
  }>((event) => onSelectedDetentChange?.(publicDetent(event)), detentRevision)
  return (
    <NativeSheet
      {...props}
      style={[{ position: 'absolute', width: 0, height: 0 }, style]}
      isPresented={isPresented}
      revision={revision}
      acknowledgedEvent={controlled.acknowledgedEvent}
      detents={detents}
      fitToContents={fitToContents}
      selectedDetentType={nativeSelection?.type ?? ''}
      selectedDetentValue={nativeSelection?.value ?? 0}
      acknowledgedDetentEvent={controlledDetent.acknowledgedEvent}
      detentRevision={detentRevision}
      interactiveDismissDisabled={interactiveDismissDisabled}
      presentationDragIndicator={presentationDragIndicator}
      presentationBackground={presentationBackground}
      presentationBackgroundInteraction={backgroundInteraction.mode}
      presentationBackgroundInteractionDetentType={backgroundInteraction.detent.type}
      presentationBackgroundInteractionDetentValue={backgroundInteraction.detent.value}
      presentationContentInteraction={presentationContentInteraction}
      presentationSizing={presentationSizing}
      onNativeSheetIsPresentedChange={({ nativeEvent }) =>
        controlled.onNativeChange(nativeEvent)
      }
      onNativeSheetDismiss={({ nativeEvent }) => {
        if (nativeEvent.revision === revision) onDismiss?.()
      }}
      onNativeSheetDetentChange={({ nativeEvent }) =>
        controlledDetent.onNativeChange(nativeEvent)
      }
    >
      <NativeContent
        collapsable={false}
        style={{ position: 'absolute', left: 0, top: 0 }}
      >
        {children}
      </NativeContent>
    </NativeSheet>
  )
}
