import React, { useCallback } from 'react'

import { KeyboardController } from '../../../../module'
import Arrow from '../../Arrow'
import Button from '../../Button'
import { TEST_ID_KEYBOARD_TOOLBAR_NEXT } from '../../constants'
import { useToolbarContext } from '../context'

import type { ButtonSubProps } from './types'
import type { GestureResponderEvent } from 'react-native'

const Next: React.FC<ButtonSubProps> = ({
  children,
  onPress,
  disabled,
  rippleRadius,
  style,
  button: ButtonContainer = Button,
  icon: IconContainer = Arrow,
}) => {
  const context = useToolbarContext()
  const { theme, isNextDisabled } = context

  const isDisabled = disabled ?? isNextDisabled

  const onPressNext = useCallback(
    (event: GestureResponderEvent) => {
      onPress?.(event)

      if (!event.isDefaultPrevented()) {
        KeyboardController.setFocusTo('next')
      }
    },
    [onPress]
  )

  return (
    <ButtonContainer
      accessibilityHint="Moves focus to the next field"
      accessibilityLabel="Next"
      disabled={isDisabled}
      rippleRadius={rippleRadius}
      style={style}
      testID={TEST_ID_KEYBOARD_TOOLBAR_NEXT}
      theme={theme}
      onPress={onPressNext}
    >
      {children ?? <IconContainer disabled={isDisabled} theme={theme} type="next" />}
    </ButtonContainer>
  )
}

export default Next
