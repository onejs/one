import { Button, SizableText, XStack, type ButtonProps } from 'tamagui'
import { useAuth } from '~/better-auth/authClient'
import type { Message, MessageWithRelations, Reaction } from '~/zero/types'
import { zero } from '~/zero'

export const MessageReactions = ({ message }: { message: MessageWithRelations }) => {
  const reactionCounts: Record<string, number> = {}

  if (message.reactions) {
    for (const reaction of message.reactions) {
      if (reaction.id) {
        reactionCounts[reaction.id] ||= 0
        reactionCounts[reaction.id]++
      }
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

export const ReactionButton = ({
  reaction,
  message,
  count,
  active,
  ...rest
}: ButtonProps & {
  count?: number
  message: Message
  reaction: Pick<Reaction, 'id' | 'value'>
  active?: boolean
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

        zero.mutate.messageReaction.insert({
          messageId: message.id,
          reactionId: reaction.id,
          creatorId: user.id,
        })
      }}
      {...(active && {
        bg: '$color2',
      })}
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
