import { Slash } from '@tamagui/lucide-icons'
import { useHotkeys } from 'react-hotkeys-hook'
import { ButtonSimple } from '~/interface/ButtonSimple'
import { updateUserState, useUserState } from '../../features/state/queries/useUserState'
import { Dialog, Input, SizableText, XStack, YStack, type TamaguiElement } from 'tamagui'
import { forwardRef } from 'react'
import { useHotMenuItems } from '~/features/state/queries/useHotMenu'

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
      <ButtonSimple
        ref={ref}
        onPress={() => {
          toggleHotMenu()
        }}
      >
        <Slash size={12} />
      </ButtonSimple>

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

            <HotMenuItems />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    </>
  )
})

const HotMenuItems = () => {
  const items = useHotMenuItems()

  return (
    <>
      {items.map((item) => {
        const { Icon } = item

        return (
          <XStack
            key={item.name}
            ai="center"
            px="$4"
            py="$4"
            gap="$4"
            hoverStyle={{
              bg: '$color3',
            }}
            onPress={() => {
              item.action()
              updateUserState({
                showHotMenu: false,
              })
            }}
          >
            <Icon size={28} />

            <SizableText cur="default" size="$6">
              {item.name}
            </SizableText>
          </XStack>
        )
      })}
    </>
  )
}
