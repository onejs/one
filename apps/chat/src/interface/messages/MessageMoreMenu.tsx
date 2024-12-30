import { EyeOff, MoreVertical, Pencil, Pin, Reply, Trash } from '@tamagui/lucide-icons'
import { forwardRef, useRef } from 'react'
import { Button, Popover, Separator, type ButtonProps } from 'tamagui'
import { updateUserSetEditingMessage } from '~/state/user'
import { zero, type MessageWithRelations } from '~/zero'
import { PopoverContent } from '../Popover'
import { ListItem } from '../lists/ListItem'
import { messageActionBarStickOpen } from './constants'
import { messageReplyEmitter } from './emitters'
import { dialogConfirm } from '~/interface/dialogs/actions'

export const MessageMoreMenu = forwardRef(
  ({ message, ...rest }: ButtonProps & { message: MessageWithRelations }, ref) => {
    const popoverRef = useRef<Popover>(null)

    return (
      <Popover
        ref={popoverRef}
        allowFlip
        stayInFrame={{ padding: 10 }}
        onOpenChange={(open) => {
          messageActionBarStickOpen.emit(open)
        }}
      >
        <Popover.Trigger asChild>
          <Button ref={ref as any} chromeless size="$2.5" {...rest}>
            <MoreVertical size={16} />
          </Button>
        </Popover.Trigger>

        <PopoverContent ov="hidden" miw={200}>
          <ListItem
            size="large"
            icon={Reply}
            onPress={() => {
              messageReplyEmitter.emit({
                type: 'reply',
                messageId: message.id,
              })
              popoverRef.current?.close()
            }}
          >
            Reply
          </ListItem>
          <ListItem
            size="large"
            icon={Pencil}
            onPress={() => {
              updateUserSetEditingMessage(message.id)
              popoverRef.current?.close()
            }}
          >
            Edit
          </ListItem>

          <ListItem
            size="large"
            theme="red"
            icon={Trash}
            onPress={async () => {
              if (
                !(await dialogConfirm({
                  title: `Are you sure you want to delete this message?`,
                }))
              ) {
                return
              }
              await zero.mutate.message.update({
                id: message.id,
                deleted: true,
              })
            }}
          >
            Delete
          </ListItem>

          <Separator width="100%" my={4} />

          <ListItem size="large" icon={Pin}>
            Pin
          </ListItem>
          <ListItem size="large" icon={EyeOff}>
            Mark Unread
          </ListItem>
        </PopoverContent>
      </Popover>
    )
  }
)
