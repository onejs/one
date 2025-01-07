import { IndentIncrease, Reply } from '@tamagui/lucide-icons'
import MDEditor from '@uiw/react-md-editor'
import { createEmitter } from '@vxrn/emitter'
import { router } from 'one'
import { memo, useState } from 'react'
import { SizableText, XStack, YStack } from 'tamagui'
import type { MessageWithRelations } from '~/zero/types'
import { Editor } from '~/editor/Editor'
import { Avatar } from '~/interface/Avatar'
import { UserInline } from '~/interface/users/UserInline'
import {
  updateUserOpenThread,
  updateUserSetEditingMessage,
  useUserCurrentChannelState,
  useUserState,
} from '~/state/user'
import { zero } from '~/zero'
import { AttachmentItem } from '../attachments/AttachmentItem'
import { galleryEmitter } from '../gallery/Gallery'
import { MessageActionBar } from './MessageActionBar'
import { MessageReactions } from './MessageReactions'
import { messageHover } from './constants'
import { messageReplyEmitter } from './emitters'

const avatarGutterWidth = 32

export const messageItemEmitter = createEmitter<
  | {
      type: 'highlight'
      id: string
    }
  | {
      type: 'cancel'
    }
>()

export const MessageItem = memo(
  ({
    message,
    hideUser,
    disableEvents,
  }: {
    message: MessageWithRelations
    disableEvents?: boolean
    hideUser?: boolean
  }) => {
    const { thread, sender } = message

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
    const [isReplying, setIsReplying] = useState(false)
    const [isHighlighted, setIsHighlighted] = useState(false)

    messageReplyEmitter.use((value) => {
      if (value.type === 'reply') {
        setIsReplying(value.messageId === message.id)
      } else {
        setIsReplying(false)
      }
    })

    messageItemEmitter.use((value) => {
      switch (value.type) {
        case 'highlight': {
          setIsHighlighted(value.id === message.id)
          break
        }
        case 'cancel': {
          setIsHighlighted(false)
          break
        }
      }
    })

    return (
      <YStack
        w="100%"
        gap="$2"
        py={hideUser ? '$1' : '$2'}
        px="$4"
        group="message"
        marginTop={-0.5}
        borderTopWidth={0.5}
        borderBottomWidth={0.5}
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
          backgroundColor: '$green2',
          borderColor: '$green3',
          hoverStyle: {
            backgroundColor: '$green1',
          },
          onDoubleClick: () => {
            openThread()
          },
        })}
        {...((isReplying || isHighlighted) && {
          backgroundColor: '$blue5',
          borderColor: '$blue7',
          hoverStyle: {
            backgroundColor: '$blue5',
          },
        })}
      >
        <MessageItemReplyingTo message={message} />

        <XStack gap="$3">
          <MessageActionBar message={message} />

          <XStack w={avatarGutterWidth}>
            {sender && !hideUser && <Avatar image={sender.image} />}
          </XStack>

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

            {!message.thread && !!message.attachments?.length && (
              <XStack gap="$4" py="$4">
                {message.attachments?.map((attachment) => {
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
                    thread with 2 replies
                  </SizableText>
                </XStack>
              </YStack>
            )}

            <MessageReactions message={message} />
          </YStack>
        </XStack>
      </YStack>
    )
  }
)

const MessageItemReplyingTo = ({ message }: { message: MessageWithRelations }) => {
  const { replyingTo } = message

  if (!replyingTo) {
    return null
  }

  return (
    <XStack
      pl={avatarGutterWidth - 18}
      gap="$2"
      cur="default"
      br="$4"
      py="$2"
      userSelect="none"
      hoverStyle={{
        bg: '$color2',
      }}
      pressStyle={{
        bg: '$color3',
      }}
      onPress={() => {
        router.setParams({
          message: replyingTo.id,
        })
      }}
    >
      <Reply scaleX="-100%" size={18} o={0.5} />
      <XStack>
        <UserInline size="small" user={replyingTo.sender!} />
      </XStack>
      <SizableText size="$2" maw="100%" ellipse o={0.7}>
        {replyingTo.content}
      </SizableText>
    </XStack>
  )
}
