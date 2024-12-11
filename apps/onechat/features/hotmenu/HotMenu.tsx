import { Slash } from '@tamagui/lucide-icons'
import { useHotkeys } from 'react-hotkeys-hook'
import { Button } from '~/interface/Button'
import { updateUserState, useUserState } from '../state/useUserState'
import { Dialog, Input, type TamaguiElement } from 'tamagui'
import { forwardRef } from 'react'

export const HotMenu = forwardRef<TamaguiElement, any>((props, ref) => {
  const [userState] = useUserState()
  const showHotMenu = !!userState?.showHotMenu

  function toggleHotMenu() {
    updateUserState({
      showHotMenu: !showHotMenu,
    })
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
      enabled: showHotMenu,
    }
  )

  return (
    <>
      <Button
        ref={ref}
        onPress={() => {
          toggleHotMenu()
        }}
      >
        <Slash size={12} />
      </Button>

      <Dialog modal open={showHotMenu}>
        <Dialog.Portal>
          <Dialog.Overlay
            key="overlay"
            animation="quickest"
            enterStyle={{ opacity: 0 }}
            exitStyle={{ opacity: 0 }}
            bg="$background075"
            onPress={() => {
              toggleHotMenu()
            }}
          />

          <Dialog.Content
            bordered
            elevate
            bg="$color2"
            key="content"
            animation={[
              'quickest',
              {
                opacity: {
                  overshootClamping: true,
                },
              },
            ]}
            enterStyle={{ x: 0, y: -10, opacity: 0 }}
            exitStyle={{ x: 0, y: 10, opacity: 0 }}
            gap="$4"
            w="80%"
            h="80%"
          >
            <Input
              onKeyPress={(key) => {
                if (key.nativeEvent.key === 'Escape') {
                  toggleHotMenu()
                }
              }}
              size="$6"
            />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    </>
  )
})
