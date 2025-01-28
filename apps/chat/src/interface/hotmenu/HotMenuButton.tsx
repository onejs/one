import { Slash } from '@tamagui/lucide-icons'
import { forwardRef } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import type { TamaguiElement } from 'tamagui'
import { ButtonSimple } from '~/interface/ButtonSimple'
import { updateSessionState, useSessionState } from '~/state/session'
import { messageInputEmitter } from '../messages/emitters'

export const HotMenuButton = forwardRef<TamaguiElement, any>((props, ref) => {
  const { showHotMenu } = useSessionState()

  function toggleHotMenu() {
    const show = !showHotMenu
    updateSessionState({
      showHotMenu: show,
    })
    if (show) {
      setTimeout(() => {
        messageInputEmitter.emit({ type: 'focus' })
      })
    }
  }

  useHotkeys('/', () => {
    toggleHotMenu()
  })

  useHotkeys(
    'Escape',
    () => {
      toggleHotMenu()
    },
    {
      enabled: !!showHotMenu,
    }
  )

  return (
    <>
      <ButtonSimple
        ref={ref}
        onPress={() => {
          toggleHotMenu()
        }}
      >
        <Slash size={12} />
      </ButtonSimple>
    </>
  )
})
