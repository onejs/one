import { Platform, StyleSheet } from 'react-native'
import {
  KeyboardAvoidingView,
  KeyboardController,
  KeyboardStickyView,
} from 'react-native-keyboard-controller'
import { YStack } from 'tamagui'
import type {
  KeyboardAvoidingFrameProps,
  KeyboardStickyFrameProps,
} from './keyboardLayoutFrameContract'

const styles = StyleSheet.create({
  fill: { flex: 1 },
})

export function KeyboardAvoidingFrame({
  children,
  enabled,
  keyboardVerticalOffset,
}: KeyboardAvoidingFrameProps) {
  if (!enabled) return <YStack flex={1}>{children}</YStack>

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={keyboardVerticalOffset}
      style={styles.fill}
    >
      {children}
    </KeyboardAvoidingView>
  )
}

export function KeyboardStickyFrame({ children, bottomInset }: KeyboardStickyFrameProps) {
  return (
    <KeyboardStickyView offset={{ closed: 0, opened: bottomInset }}>
      {children}
    </KeyboardStickyView>
  )
}

export function dismissKeyboard() {
  KeyboardController.dismiss()
}
