import { SizableText, XStack, YStack } from 'tamagui'
import { useHotMenuItems } from '~/interface/hotmenu/useHotMenuItems'
import { MessageInput } from '~/interface/messages/MessageInput'
import { Row } from '~/interface/Row'
import { SearchableInput, SearchableList, SearchableListItem } from '~/interface/SearchableList'
import { updateSessionState, useSessionState } from '~/state/session'

export const MainMessageInput = () => {
  return (
    <XStack pos="absolute" b={0} l={252} r={0}>
      <HotMenuContent />
      <YStack w="100%" pos="relative" zi={100_000}>
        <MessageInput />
      </YStack>
    </XStack>
  )
}

const HotMenuContent = () => {
  const { showHotMenu } = useSessionState()
  const items = useHotMenuItems()

  function toggleHotMenu() {
    updateSessionState({
      showHotMenu: !showHotMenu,
    })
  }

  return (
    <YStack
      animation="quicker"
      pos="absolute"
      t={-400 + 80}
      pb={80}
      h={400 + 80}
      r={0}
      l={0}
      o={0}
      y={0}
      zi={10_000}
      bg="$background075"
      btrr="$7"
      btlr="$7"
      ov="hidden"
      shadowColor="$shadowColor"
      shadowRadius={20}
      shadowOffset={{ height: -5, width: 0 }}
      style={{
        backdropFilter: 'blur(50px)',
      }}
      {...(showHotMenu && {
        o: 1,
        y: 10,
      })}
    >
      <SearchableList
        items={items}
        searchKey="name"
        onSelectItem={(item) => {
          toggleHotMenu()
          item.action()
        }}
      >
        {/* <SearchableInput
          size="$6"
          // @ts-expect-error
          onKeyUp={(key) => {
            if (key.nativeEvent.key === 'Escape') {
              toggleHotMenu()
            }
          }}
        /> */}

        {items.map((item, index) => {
          const { Icon } = item

          return (
            <SearchableListItem key={item.name} index={index}>
              {(active, itemProps) => {
                return (
                  <Row
                    ai="center"
                    px="$4"
                    py="$4"
                    gap="$4"
                    hoverStyle={{
                      bg: '$color3',
                    }}
                    {...(active && {
                      bg: '$color1',
                      hoverStyle: {
                        bg: '$color1',
                      },
                    })}
                    onPress={() => {
                      item.action()
                      updateSessionState({
                        showHotMenu: false,
                      })
                    }}
                    {...itemProps}
                  >
                    <Icon size={18} />

                    <SizableText cur="default" size="$5">
                      {item.name}
                    </SizableText>
                  </Row>
                )
              }}
            </SearchableListItem>
          )
        })}
      </SearchableList>
    </YStack>
  )
}
