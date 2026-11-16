import React from 'react'
import { useCallback } from 'react'

import { KeyboardController } from '../../../../module'
import Arrow from '../../Arrow'
import Button from '../../Button'
import { TEST_ID_KEYBOARD_TOOLBAR_PREVIOUS } from '../../constants'
import { useToolbarContext } from '../context'

import type { ButtonSubProps } from './types'
import type { GestureResponderEvent } from 'react-native'

const Prev: React.FC<ButtonSubProps> = ({
  children,
  onPress: onPressCallback,
  disabled,
  rippleRadius,
  style,
  button: ButtonContainer = Button,
  icon: IconContainer = Arrow,
}) => {
  const context = useToolbarContext()
  const { theme, isPrevDisabled } = context

  const isDisabled = disabled ?? isPrevDisabled

  const onPressPrev = useCallback(
    (event: GestureResponderEvent) => {
      onPressCallback?.(event)

      if (!event.isDefaultPrevented()) {
        KeyboardController.setFocusTo('prev')
      }
    },
    [onPressCallback]
  )

  return (
    <ButtonContainer
      accessibilityHint="Moves focus to the previous field"
      accessibilityLabel="Previous"
      disabled={isDisabled}
      rippleRadius={rippleRadius}
      style={style}
      testID={TEST_ID_KEYBOARD_TOOLBAR_PREVIOUS}
      theme={theme}
      onPress={onPressPrev}
    >
      {children ?? <IconContainer disabled={isDisabled} theme={theme} type="prev" />}
    </ButtonContainer>
  )
}

export default Prev
