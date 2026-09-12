import { Platform } from 'react-native'
import { InsideContainer } from './Containers.native'
import { useControlled } from './controlled'
import { assertSwiftUIValue } from './generated/swiftui'
import type { PopoverProps } from './generated/popoverTypes'
import NativeContent from './specs/OneNativePopoverContentNativeComponent'
import NativePopover from './specs/OneNativePopoverNativeComponent'

// the children are the trigger and compose into SwiftUI like any container's; `content`
// is the React Native subtree the popover presents.
export function Popover({
  isPresented,
  onIsPresentedChange,
  revision = 0,
  arrowEdge,
  presentationCompactAdaptation = 'automatic',
  contentWidth,
  contentHeight,
  content,
  children,
  style,
  ...props
}: PopoverProps) {
  if (typeof isPresented !== 'boolean')
    throw new Error('Swift.Popover isPresented must be a boolean')
  // SwiftUI sizes a popover from its content, and a React Native subtree has no ideal
  // size, so the box is given rather than measured.
  if (!Number.isFinite(contentWidth) || contentWidth <= 0)
    throw new Error('Swift.Popover contentWidth must be a positive number')
  if (!Number.isFinite(contentHeight) || contentHeight <= 0)
    throw new Error('Swift.Popover contentHeight must be a positive number')
  const iosVersion = Number.parseFloat(String(Platform.Version))
  if (arrowEdge !== undefined) assertSwiftUIValue('Edge', arrowEdge, iosVersion)
  assertSwiftUIValue('PresentationAdaptation', presentationCompactAdaptation, iosVersion)
  const controlled = useControlled<{
    isPresented: boolean
    eventCount: number
    revision: number
  }>((event) => onIsPresentedChange(event.isPresented), revision)
  // the trigger reports the height SwiftUI measured, so Yoga must not be given one.
  return (
    <NativePopover
      {...props}
      style={[{ alignSelf: 'stretch' }, style]}
      isPresented={isPresented}
      revision={revision}
      acknowledgedEvent={controlled.acknowledgedEvent}
      arrowEdge={arrowEdge ?? ''}
      presentationCompactAdaptation={presentationCompactAdaptation}
      contentWidth={contentWidth}
      contentHeight={contentHeight}
      onNativePopoverIsPresentedChange={({ nativeEvent }) =>
        controlled.onNativeChange(nativeEvent)
      }
    >
      <InsideContainer value={true}>{children}</InsideContainer>
      <NativeContent collapsable={false} style={{ position: 'absolute', left: 0, top: 0 }}>
        <InsideContainer value={false}>{content}</InsideContainer>
      </NativeContent>
    </NativePopover>
  )
}
