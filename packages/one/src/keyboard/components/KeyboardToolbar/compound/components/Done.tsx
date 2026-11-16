import React from 'react'
import { useCallback, useMemo } from 'react'
import { StyleSheet, Text } from 'react-native'

import { useKeyboardState } from '../../../../hooks'
import { KeyboardController } from '../../../../module'
import Button from '../../Button'
import { TEST_ID_KEYBOARD_TOOLBAR_DONE } from '../../constants'
import { useToolbarContext } from '../context'

import type { ButtonSubProps } from './types'
import type { ReactNode } from 'react'
import type { GestureResponderEvent } from 'react-native'

const Done: React.FC<Omit<ButtonSubProps, 'icon'> & { text?: ReactNode }> = ({
  children,
  onPress,
  rippleRadius = 28,
  text,
  button: ButtonContainer = Button,
}) => {
  const colorScheme = useKeyboardState((state) => state.appearance)
  const context = useToolbarContext()
  const { theme } = context

  const doneStyle = useMemo(
    () => [styles.doneButton, { color: theme[colorScheme].primary }],
    [colorScheme, theme]
  )

  const onPressDone = useCallback(
    (event: GestureResponderEvent) => {
      onPress?.(event)

      if (!event.isDefaultPrevented()) {
        KeyboardController.dismiss()
      }
    },
    [onPress]
  )

  return (
    <ButtonContainer
      accessibilityHint="Closes the keyboard"
      accessibilityLabel="Done"
      rippleRadius={rippleRadius}
      style={styles.doneButtonContainer}
      testID={TEST_ID_KEYBOARD_TOOLBAR_DONE}
      theme={theme}
      onPress={onPressDone}
    >
      <Text maxFontSizeMultiplier={1.3} style={doneStyle}>
        {children ?? text ?? 'Done'}
      </Text>
    </ButtonContainer>
  )
}

const styles = StyleSheet.create({
  doneButton: {
    fontWeight: '600',
    fontSize: 15,
  },
  doneButtonContainer: {
    marginRight: 16,
    marginLeft: 8,
  },
})

export default Done
