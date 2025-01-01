import { Pin } from '@tamagui/lucide-icons'
import { ListItem, Popover } from 'tamagui'
import { closeCurrentThread } from '../../state/user'
import { ButtonSimple } from '../ButtonSimple'
import { PopoverContent } from '../Popover'
import { useCurrentChannelPins } from '../../state/channel/useCurrentChannelPins'
import { MessageItem } from '../messages/MessageItem'

export const ChannelPinsPopover = () => {
  const pins = useCurrentChannelPins()

  return (
    <Popover allowFlip stayInFrame={{ padding: 10 }}>
      <Popover.Trigger>
        <ButtonSimple
          tooltip="Pins"
          onPress={() => {
            closeCurrentThread()
          }}
          icon={Pin}
        />
      </Popover.Trigger>

      <PopoverContent miw={500} mih="calc(80vh)" p="$3" gap="$3">
        {pins.map((pin) => {
          if (!pin.message) return null
          return <MessageItem key={pin.id} message={pin.message} />
        })}
      </PopoverContent>
    </Popover>
  )
}
