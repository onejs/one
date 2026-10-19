import { Platform } from 'react-native'
import { InsideContainer, assertOneNativeChildren, swiftStyleProps } from './Containers.native'
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
  content,
  children,
  style,
  swiftStyle,
  ...props
}: PopoverProps) {
  if (typeof isPresented !== 'boolean')
    throw new Error('Swift.Popover isPresented must be a boolean')
  // SwiftUI sizes a popover from its content, whose laid-out size the bridge
  // measures back as the ideal size. give the content a fixed size; a flexible
  // child fills the provisional popover and has no smaller size to fit.
  const iosVersion = Number.parseFloat(String(Platform.Version))
  if (arrowEdge !== undefined) assertSwiftUIValue('Edge', arrowEdge, iosVersion)
  assertSwiftUIValue('PresentationAdaptation', presentationCompactAdaptation, iosVersion)
  // the trigger composes into SwiftUI; the presented content stays React Native.
  assertOneNativeChildren(children, 'Swift.Popover')
  const controlled = useControlled<{
    isPresented: boolean
    eventCount: number
    revision: number
  }>((event) => onIsPresentedChange(event.isPresented), revision)
  // the trigger reports the height SwiftUI measured, so Yoga must not be given one.
  return (
    <NativePopover
      {...props}
      {...swiftStyleProps(swiftStyle)}
      style={[{ alignSelf: 'stretch' }, style]}
      isPresented={isPresented}
      revision={revision}
      acknowledgedEvent={controlled.acknowledgedEvent}
      arrowEdge={arrowEdge ?? ''}
      presentationCompactAdaptation={presentationCompactAdaptation}
      onNativePopoverIsPresentedChange={({ nativeEvent }) =>
        controlled.onNativeChange(nativeEvent)
      }
    >
      <InsideContainer value={true}>{children}</InsideContainer>
      <NativeContent
        collapsable={false}
        style={{ position: 'absolute', left: 0, top: 0 }}
      >
        <InsideContainer value={false}>{content}</InsideContainer>
      </NativeContent>
    </NativePopover>
  )
}
