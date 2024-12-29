import { SmilePlus } from '@tamagui/lucide-icons'
import { Button, Popover, ScrollView, TooltipSimple, XStack } from 'tamagui'
import { SearchableInput, SearchableList, SearchableListItem } from '../SearchableList'
import { useQuery } from '~/zero'
import { ButtonSimple } from '../ButtonSimple'
import { PopoverContent } from '../Popover'
import { useEffect, useState } from 'react'
import { messageActionBarStickOpen } from './constants'
import { experimental_VGrid as VGrid } from 'virtua'

export const AddReactionButton = () => {
  const [reactions] = useQuery((q) => q.reaction.orderBy('keyword', 'desc'))
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (open) {
      messageActionBarStickOpen.emit(true)
      return () => {
        messageActionBarStickOpen.emit(false)
      }
    }
  }, [open])

  const columns = 8
  const rows = Math.ceil(reactions.length / columns)

  return (
    <Popover
      open={open}
      offset={{
        mainAxis: 5,
      }}
      allowFlip
      placement="bottom-start"
      onOpenChange={setOpen}
    >
      <Popover.Trigger>
        <TooltipSimple label="Add reaction">
          <Button chromeless size="$2.5" br={0}>
            <SmilePlus size={16} />
          </Button>
        </TooltipSimple>
      </Popover.Trigger>

      <PopoverContent width={300} height={300}>
        {open && (
          <SearchableList onSelectItem={() => {}} items={reactions}>
            <XStack p="$2" w="100%">
              <SearchableInput size="$4" f={1} />
            </XStack>

            <VGrid
              style={{ flex: 1, maxWidth: '100%' }}
              row={rows}
              col={columns}
              cellWidth={30}
              cellHeight={30}
            >
              {({ rowIndex, colIndex }) => {
                const index = rowIndex * columns + colIndex
                const reaction = reactions[index]
                return (
                  <SearchableListItem index={index}>
                    {(active, itemProps) => {
                      return (
                        <ButtonSimple active={active} {...itemProps}>
                          {reaction?.value}
                        </ButtonSimple>
                      )
                    }}
                  </SearchableListItem>
                )
              }}
            </VGrid>
          </SearchableList>
        )}
      </PopoverContent>
    </Popover>
  )
}
