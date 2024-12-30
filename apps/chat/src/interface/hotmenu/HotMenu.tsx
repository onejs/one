import { Slash } from '@tamagui/lucide-icons'
import { forwardRef, useEffect, useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { Dialog, SizableText, type TamaguiElement } from 'tamagui'
import { ButtonSimple } from '~/interface/ButtonSimple'
import { useHotMenuItems } from '~/state/hotMenu'
import { updateSessionState, useSessionState } from '~/state/session'
import { Row } from '../Row'
import { SearchableInput, SearchableList, SearchableListItem } from '../SearchableList'

export const HotMenu = forwardRef<TamaguiElement, any>((props, ref) => {
  const { showHotMenu } = useSessionState()
  const allItems = useHotMenuItems()
  const [items, setItems] = useState(allItems)

  useEffect(() => {
    setItems(allItems)
  }, [allItems])

  function toggleHotMenu() {
    updateSessionState({
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
              searchKey="name"
              onSearch={setItems}
              onSelectItem={(item) => {
                toggleHotMenu()
                item.action()
              }}
            >
              <SearchableInput
                size="$6"
                // @ts-expect-error
                onKeyUp={(key) => {
                  if (key.nativeEvent.key === 'Escape') {
                    toggleHotMenu()
                  }
                }}
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
                            updateSessionState({
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
