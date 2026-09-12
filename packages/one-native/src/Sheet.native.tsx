import { Platform } from 'react-native'
import { useControlled } from './controlled'
import NativeSheet from './specs/OneNativeSheetNativeComponent'
import NativeContent from './specs/OneNativeSheetContentNativeComponent'
import { assertSwiftUIValue } from './generated/swiftui'
import type { FullScreenCoverProps, SheetProps } from './generated/sheetTypes'

const DEFAULT_DETENTS = ['large'] as const
export function Sheet({
  isPresented,
  onIsPresentedChange,
  onDismiss,
  revision = 0,
  presentationDetents = DEFAULT_DETENTS,
  presentationDragIndicator = 'automatic',
  interactiveDismissDisabled = false,
  children,
  style,
  ...props
}: SheetProps) {
  if (typeof isPresented !== 'boolean')
    throw new Error('Swift.Sheet isPresented must be a boolean')
  if (!Array.isArray(presentationDetents) || !presentationDetents.length)
    throw new Error('Swift.Sheet requires at least one presentation detent')
  const detents = presentationDetents.map((detent) => {
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
  })
  assertSwiftUIValue(
    'Visibility',
    presentationDragIndicator,
    Number.parseFloat(String(Platform.Version))
  )
  const controlled = useControlled<{
    isPresented: boolean
    eventCount: number
    revision: number
  }>((event) => onIsPresentedChange(event.isPresented), revision)
  return (
    <NativeSheet
      {...props}
      style={[{ position: 'absolute', width: 0, height: 0 }, style]}
      isPresented={isPresented}
      revision={revision}
      acknowledgedEvent={controlled.acknowledgedEvent}
      detents={detents}
      interactiveDismissDisabled={interactiveDismissDisabled}
      presentationDragIndicator={presentationDragIndicator}
      presentation="sheet"
      onNativeSheetIsPresentedChange={({ nativeEvent }) =>
        controlled.onNativeChange(nativeEvent)
      }
      onNativeSheetDismiss={({ nativeEvent }) => {
        if (nativeEvent.revision === revision) onDismiss?.()
      }}
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

// a cover reads no detents and no drag indicator; the native root applies neither on this
// presentation, so these carry the shape the spec requires and nothing more.
const COVER_DETENTS = [] as const
export function FullScreenCover({
  isPresented,
  onIsPresentedChange,
  onDismiss,
  revision = 0,
  children,
  style,
  ...props
}: FullScreenCoverProps) {
  if (typeof isPresented !== 'boolean')
    throw new Error('Swift.FullScreenCover isPresented must be a boolean')
  const controlled = useControlled<{
    isPresented: boolean
    eventCount: number
    revision: number
  }>((event) => onIsPresentedChange(event.isPresented), revision)
  return (
    <NativeSheet
      {...props}
      style={[{ position: 'absolute', width: 0, height: 0 }, style]}
      isPresented={isPresented}
      revision={revision}
      acknowledgedEvent={controlled.acknowledgedEvent}
      detents={COVER_DETENTS}
      interactiveDismissDisabled={false}
      presentationDragIndicator="automatic"
      presentation="fullScreenCover"
      onNativeSheetIsPresentedChange={({ nativeEvent }) =>
        controlled.onNativeChange(nativeEvent)
      }
      onNativeSheetDismiss={({ nativeEvent }) => {
        if (nativeEvent.revision === revision) onDismiss?.()
      }}
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
