import { SmilePlus } from '@tamagui/lucide-icons'
import { Button, Popover, ScrollView, TooltipSimple, XStack } from 'tamagui'
import { SearchableInput, SearchableList, SearchableListItem } from '../SearchableList'
import { useQuery } from '~/features/state/zero'
import { ButtonSimple } from '../ButtonSimple'

export const AddReactionButton = () => {
  const [reactions] = useQuery((q) => q.reaction.orderBy('keyword', 'desc'))

  return (
    <Popover
      offset={{
        mainAxis: 5,
      }}
      allowFlip
      placement="bottom-start"
    >
      <Popover.Trigger>
        <TooltipSimple label="Add reaction">
          <Button chromeless size="$2.5" br={0}>
            <SmilePlus size={16} />
          </Button>
        </TooltipSimple>
      </Popover.Trigger>

      <Popover.Content
        width={300}
        borderWidth={1}
        height={300}
        borderColor="$borderColor"
        enterStyle={{ y: -10, opacity: 0 }}
        exitStyle={{ y: -10, opacity: 0 }}
        elevate
        animation={[
          'quick',
          {
            opacity: {
              overshootClamping: true,
            },
          },
        ]}
        padding={0}
      >
        <Popover.Arrow size="$4" />

        <SearchableList onSelectItem={() => {}} items={reactions}>
          <XStack p="$2" w="100%">
            <SearchableInput size="$4" f={1} />
          </XStack>

          <ScrollView f={1}>
            <XStack fw="wrap" ai="center">
              {reactions.map((reaction, index) => {
                return (
                  <SearchableListItem key={reaction.id} index={index}>
                    {(active, itemProps) => {
                      return (
                        <ButtonSimple active={active} {...itemProps}>
                          {reaction.value}
                        </ButtonSimple>
                      )
                    }}
                  </SearchableListItem>
                )
              })}
            </XStack>
          </ScrollView>
        </SearchableList>
      </Popover.Content>
    </Popover>
  )
}
