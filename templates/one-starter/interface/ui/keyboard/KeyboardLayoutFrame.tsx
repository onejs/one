// keyboard layout frames: web has no software keyboard to avoid, so the frames
// are plain containers and dismissal blurs the focused element;
// KeyboardLayoutFrame.native.tsx wires react-native-keyboard-controller.
import { YStack } from 'tamagui'
import type {
  KeyboardAvoidingFrameProps,
  KeyboardStickyFrameProps,
} from './keyboardLayoutFrameContract'

export function KeyboardAvoidingFrame({ children }: KeyboardAvoidingFrameProps) {
  return <YStack flex={1}>{children}</YStack>
}

export function KeyboardStickyFrame({ children }: KeyboardStickyFrameProps) {
  return children
}

export function dismissKeyboard() {
  if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
    document.activeElement.blur()
  }
}
