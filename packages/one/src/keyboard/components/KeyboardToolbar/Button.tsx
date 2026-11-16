import React, { useMemo } from 'react'
import { Platform, Pressable, TouchableOpacity, View } from 'react-native'

import { useKeyboardState } from '../../hooks'

import type { KeyboardToolbarTheme } from './types'
import type { PropsWithChildren } from 'react'
import type { GestureResponderEvent, ViewStyle } from 'react-native'

type ButtonProps = {
  disabled?: boolean
  onPress: (event: GestureResponderEvent) => void
  accessibilityLabel: string
  accessibilityHint: string
  testID: string
  rippleRadius?: number
  style?: ViewStyle
  theme: KeyboardToolbarTheme
}

const ButtonIOS = ({
  children,
  onPress,
  disabled,
  accessibilityLabel,
  accessibilityHint,
  testID,
  style,
}: PropsWithChildren<ButtonProps>) => {
  // immediately switch to plain view to avoid animation flickering
  // when fade out animation happens and view becomes disabled
  const Container = disabled
    ? (View as unknown as typeof TouchableOpacity)
    : TouchableOpacity
  const accessibilityState = useMemo(() => ({ disabled }), [disabled])

  return (
    <Container
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={accessibilityState}
      style={style}
      testID={testID}
      onPress={onPress}
    >
      {children}
    </Container>
  )
}
const ButtonAndroid = ({
  children,
  onPress,
  disabled,
  accessibilityLabel,
  accessibilityHint,
  testID,
  rippleRadius = 18,
  style,
  theme,
}: PropsWithChildren<ButtonProps>) => {
  const colorScheme = useKeyboardState((state) => state.appearance)
  const accessibilityState = useMemo(() => ({ disabled }), [disabled])
  const ripple = useMemo(
    () => ({ color: theme[colorScheme].ripple, borderless: true, radius: rippleRadius }),
    [colorScheme, rippleRadius, theme]
  )

  return (
    <Pressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={accessibilityState}
      android_ripple={ripple}
      disabled={disabled}
      style={style}
      testID={testID}
      onPress={onPress}
    >
      {children}
    </Pressable>
  )
}

export default Platform.select({
  android: ButtonAndroid,
  default: ButtonIOS,
})
