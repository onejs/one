import { SmilePlus } from '@tamagui/lucide-icons'
import { Button, Popover, ScrollView, TooltipSimple, XStack } from 'tamagui'
import { SearchableInput, SearchableList, SearchableListItem } from '../SearchableList'
import { useQuery } from '~/state/zero'
import { ButtonSimple } from '../ButtonSimple'
import { PopoverContent } from '../Popover'

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

      <PopoverContent width={300} height={300}>
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
      </PopoverContent>
    </Popover>
  )
}
