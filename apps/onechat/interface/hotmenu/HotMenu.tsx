import { Slash } from '@tamagui/lucide-icons'
import { useHotkeys } from 'react-hotkeys-hook'
import { ButtonSimple } from '~/interface/ButtonSimple'
import { updateUserState, useUserState } from '../../features/state/queries/useUserState'
import { Dialog, Input, SizableText, XStack, YStack, type TamaguiElement } from 'tamagui'
import { forwardRef } from 'react'
import { useHotMenuItems } from '~/features/state/queries/useHotMenu'
import { SearchableInput, SearchableList, SearchableListItem } from '../SearchableList'
import { Row } from '../Row'

export const HotMenu = forwardRef<TamaguiElement, any>((props, ref) => {
  const [userState] = useUserState()
  const showHotMenu = !!userState?.showHotMenu
  const items = useHotMenuItems()

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
            <SearchableList
              items={items}
              onSelectItem={(item) => {
                toggleHotMenu()
                item.action()
              }}
            >
              <SearchableInput
                onKeyPress={(key) => {
                  if (key.nativeEvent.key === 'Escape') {
                    toggleHotMenu()
                  }
                }}
                size="$6"
              />

              {items.map((item, index) => {
                const { Icon } = item

                return (
                  <SearchableListItem key={item.name} index={index}>
                    {(active, itemProps) => {
                      return (
                        <Row
                          active={active}
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
                          {...itemProps}
                        >
                          <Icon size={28} />

                          <SizableText cur="default" size="$6">
                            {item.name}
                          </SizableText>
                        </Row>
                      )
                    }}
                  </SearchableListItem>
                )
              })}
            </SearchableList>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    </>
  )
})
