import { IndentIncrease } from '@tamagui/lucide-icons'
import MDEditor from '@uiw/react-md-editor'
import { memo } from 'react'
import { SizableText, XStack, YStack } from 'tamagui'
import { Editor } from '~/editor/Editor'
import { Avatar } from '~/interface/Avatar'
import {
  updateUserOpenThread,
  updateUserSetEditingMessage,
  useUserCurrentChannelState,
  useUserState,
} from '~/state/user'
import type { Channel, MessageWithRelations, Thread, User } from '~/zero'
import { zero } from '~/zero'
import { MessageActionBar } from './MessageActionBar'
import { MessageReactions } from './MessageReactions'
import { messageHover } from './constants'
import { AttachmentItem } from '../attachments/AttachmentItem'
import { galleryEmitter } from '../gallery/Gallery'

export const MessageItem = memo(
  ({
    message,
    hideUser,
    disableEvents,
    channel,
  }: {
    message: MessageWithRelations
    channel: Channel
    disableEvents?: boolean
    hideUser?: boolean
  }) => {
    const thread = (message.thread || [])[0] as Thread | undefined
    const sender = (message.sender || [])[0] as User | undefined

    const openThread = () => {
      if (thread) {
        updateUserOpenThread(thread)
      }
    }

    const channelState = useUserCurrentChannelState()
    const [userState, { user }] = useUserState()

    const isMyMessage = sender?.id === user?.id
    const isFocused = !disableEvents && channelState?.focusedMessageId === message.id
    const isEditing = channelState?.editingMessageId === message.id

    return (
      <XStack
        f={1}
        gap="$3"
        py={hideUser ? '$1' : '$2'}
        px="$4"
        group="message"
        borderTopWidth={2}
        borderBottomWidth={2}
        borderColor="transparent"
        onMouseEnter={() => {
          messageHover.emit(message.id)
        }}
        onMouseLeave={() => {
          messageHover.emit(message.id)
        }}
        hoverStyle={{
          bg: '$background025',
        }}
        {...(isFocused && {
          backgroundColor: '$color4',
        })}
        {...(thread && {
          borderColor: '$green5',
          onDoubleClick: () => {
            openThread()
          },
        })}
      >
        <MessageActionBar channel={channel} message={message} />

        <XStack w={32}>{sender && !hideUser && <Avatar image={sender.image} />}</XStack>

        <YStack f={1} gap="$1">
          {sender && !hideUser && (
            <SizableText o={0.5} mb={-4} fow="bold">
              {sender.username || sender.name}
            </SizableText>
          )}

          <SizableText f={1} ov="hidden">
            {isEditing ? (
              <Editor
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    updateUserSetEditingMessage(undefined)
                  }
                }}
                onSubmit={(content) => {
                  updateUserSetEditingMessage(undefined)
                  zero.mutate.message.update({
                    id: message.id,
                    content,
                  })
                }}
                initialValue={
                  userState.messageEdits?.find((x) => x.id === message.id)?.content ??
                  message.content
                }
              />
            ) : (
              <MDEditor.Markdown
                source={message.content}
                style={{ whiteSpace: 'pre-wrap', background: 'transparent', borderWidth: 0 }}
              />
            )}
          </SizableText>

          {!!message.attachments?.length && (
            <XStack gap="$4" py="$4">
              {message.attachments.map((attachment) => {
                return (
                  <AttachmentItem
                    editable={isMyMessage}
                    key={attachment.id}
                    attachment={attachment}
                    onDelete={() => {
                      zero.mutate.attachment.delete({
                        id: attachment.id,
                      })
                    }}
                    onPress={() => {
                      galleryEmitter.emit({
                        items: message.attachments,
                        firstItem: attachment.id,
                      })
                    }}
                  />
                )
              })}
            </XStack>
          )}

          {thread && (
            <YStack>
              <XStack
                bg="$color2"
                als="flex-start"
                px="$2"
                br="$8"
                ai="center"
                gap="$2"
                hoverStyle={{
                  bg: '$color5',
                }}
                onPress={() => {
                  openThread()
                }}
              >
                <IndentIncrease o={0.5} size={16} />
                <SizableText cur="default" o={0.5} size="$3">
                  This is a thread
                </SizableText>
              </XStack>
            </YStack>
          )}

          <MessageReactions message={message} />
        </YStack>
      </XStack>
    )
  }
)
