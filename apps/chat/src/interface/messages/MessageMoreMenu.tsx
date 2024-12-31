import { EyeOff, MoreVertical, Pencil, Pin, Reply, Trash } from '@tamagui/lucide-icons'
import { forwardRef } from 'react'
import { Button, type ButtonProps } from 'tamagui'
import { dialogConfirm } from '~/interface/dialogs/actions'
import { updateUserSetEditingMessage } from '~/state/user'
import { zero, type MessageWithRelations } from '~/zero'
import { Menu } from '../menu/Menu'
import { messageActionBarStickOpen } from './constants'
import { messageReplyEmitter } from './emitters'

export const MessageMoreMenu = forwardRef(
  ({ message, ...rest }: ButtonProps & { message: MessageWithRelations }, ref) => {
    return (
      <Menu
        popoverProps={{
          onOpenChange: (open) => {
            messageActionBarStickOpen.emit(open)
          },
        }}
        trigger={
          <Button ref={ref as any} chromeless size="$2.5" {...rest}>
            <MoreVertical size={16} />
          </Button>
        }
        items={[
          {
            id: 'reply',
            icon: Reply,
            children: 'Reply',
            onPress: () => {
              messageReplyEmitter.emit({
                type: 'reply',
                messageId: message.id,
              })
            },
          },
          {
            id: 'edit',
            icon: Pencil,
            children: 'Edit',
            onPress: () => {
              updateUserSetEditingMessage(message.id)
            },
          },
          {
            id: 'edit',
            theme: 'red',
            icon: Trash,
            children: 'Delete',
            onPress: async () => {
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
            },
          },
          {
            separator: true,
          },
          {
            id: 'pin',
            icon: Pin,
            children: 'Pin',
          },
          {
            id: 'unread',
            icon: EyeOff,
            children: 'Mark Unread',
          },
        ]}
      />
    )
  }
)
