import NativeHapticTap from '../specs/OneNativeHapticTapNativeComponent'
import type { HapticTapProps } from './types'
import { assertImpact } from './validation'

// a view that plays feedback when a tap inside it ends. the native view
// recognizes the tap on the UI thread, so the haptic lands with the finger
// lifting even while JavaScript is busy; presses inside still reach JS.
export function HapticTap({ feedback = 'selection', ...props }: HapticTapProps) {
  if (feedback !== 'selection') assertImpact(feedback)
  return <NativeHapticTap {...props} feedback={feedback} />
}
