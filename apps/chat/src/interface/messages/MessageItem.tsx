import { IndentIncrease, MoreVertical, Reply } from '@tamagui/lucide-icons'
import MDEditor from '@uiw/react-md-editor'
import { memo } from 'react'
import {
  Button,
  type ButtonProps,
  Separator,
  SizableText,
  TooltipSimple,
  XGroup,
  XStack,
  YStack,
} from 'tamagui'
import { useAuth } from '~/better-auth/authClient'
import { randomID } from '~/helpers/randomID'
import { Avatar } from '~/interface/Avatar'
import { getCurrentUser, updateUserOpenThread, useUserCurrentChannelState } from '~/state/user'
import type { Channel, Message, MessageWithRelations, Reaction, Thread, User } from '~/zero/schema'
import { mutate, useQuery } from '~/zero/zero'
import { AddReactionButton } from './AddReactionButton'

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
    const isFocused = !disableEvents && channelState.focusedMessageId === message.id

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
            <MDEditor.Markdown
              source={message.content}
              style={{ whiteSpace: 'pre-wrap', background: 'transparent', borderWidth: 0 }}
            />
          </SizableText>

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

const MessageActionBar = ({
  message,
  channel,
}: { message: MessageWithRelations; channel: Channel }) => {
  const [topReactions] = useQuery((q) => q.reaction.limit(3).orderBy('createdAt', 'desc'))

  return (
    <XStack
      pos="absolute"
      t={-8}
      r={8}
      o={0}
      elevation="$0.5"
      br="$4"
      zi={1000}
      $group-message-hover={{ o: 1 }}
    >
      <XGroup bg="$color2">
        {topReactions.map((reaction) => {
          return <ReactionButton key={reaction.id} message={message} reaction={reaction} />
        })}

        <AddReactionButton />

        <Separator my="$2" vertical />

        {!message.thread?.[0] && (
          <TooltipSimple label="Create Thread">
            <Button
              onPress={() => {
                const currentUser = getCurrentUser()
                if (!currentUser) {
                  console.error(`no user`)
                  return
                }

                const threadId = randomID()

                mutate.thread.insert({
                  id: threadId,
                  channelId: channel.id,
                  messageId: message.id,
                  createdAt: new Date().getTime(),
                  creatorId: currentUser.id,
                  description: '',
                  title: '',
                })

                mutate.message.update({
                  id: message.id,
                  threadId,
                  isThreadReply: false,
                })

                updateUserOpenThread({
                  id: threadId,
                })
              }}
              chromeless
              size="$2.5"
              br={0}
            >
              <IndentIncrease size={16} />
            </Button>
          </TooltipSimple>
        )}

        <TooltipSimple label="Quote Reply">
          <Button chromeless size="$2.5" br={0}>
            <Reply size={16} />
          </Button>
        </TooltipSimple>

        <Button chromeless size="$2.5">
          <MoreVertical size={16} />
        </Button>
      </XGroup>
    </XStack>
  )
}

const MessageReactions = ({ message }: { message: MessageWithRelations }) => {
  // reaction.id => count
  const reactionCounts: Record<string, number> = {}
  for (const reaction of message.reactions) {
    if (reaction.id) {
      reactionCounts[reaction.id] ||= 0
      reactionCounts[reaction.id]++
    }
  }

  return (
    <XStack>
      {Object.entries(reactionCounts).map(([id, count]) => {
        const reaction = message.reactions.find((x) => x.id === id)
        if (!reaction) {
          return null
        }
        return (
          <ReactionButton key={reaction.id} count={count} message={message} reaction={reaction} />
        )
      })}
    </XStack>
  )
}

const ReactionButton = ({
  reaction,
  message,
  count,
  ...rest
}: ButtonProps & {
  count?: number
  message: Message
  reaction: Pick<Reaction, 'id' | 'value'>
}) => {
  const { user } = useAuth()

  return (
    <Button
      chromeless
      size="$2.5"
      {...rest}
      onPress={() => {
        if (!user) {
          return
        }

        mutate.messageReaction.insert({
          createdAt: new Date().getTime(),
          messageId: message.id,
          reactionId: reaction.id,
          userId: user.id,
        })
      }}
    >
      {typeof count === 'number' && (
        <SizableText
          pos="absolute"
          t={-5}
          br="$10"
          r={-5}
          bg="$color5"
          w={20}
          h={20}
          size="$1"
          lh={20}
          ai="center"
          jc="center"
        >
          {count}
        </SizableText>
      )}
      {reaction.value}
    </Button>
  )
}
