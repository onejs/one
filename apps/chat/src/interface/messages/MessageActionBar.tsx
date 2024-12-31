import { IndentIncrease, Reply } from '@tamagui/lucide-icons'
import { useState } from 'react'
import { Button, Separator, TooltipSimple, XGroup, XStack } from 'tamagui'
import { randomId } from '~/helpers/randomId'
import { getCurrentUser, updateUserOpenThread } from '~/state/user'
import type { Channel, MessageWithRelations } from '~/zero'
import { useQuery, zero } from '~/zero'
import { AddReactionButton } from './AddReactionButton'
import { MessageMoreMenu } from './MessageMoreMenu'
import { ReactionButton } from './MessageReactions'
import { messageActionBarStickOpen, messageHover } from './constants'
import { messageReplyEmitter } from './emitters'

export const MessageActionBar = ({
  message,
  channel,
}: {
  message: MessageWithRelations
  channel: Channel
}) => {
  const [topReactions] = useQuery((q) => q.reaction.limit(3).orderBy('createdAt', 'desc'))
  const [show, setShow] = useState(false)
  const stickOpen = messageActionBarStickOpen.useValue()

  messageHover.use(
    (val) => {
      if (stickOpen) {
        return
      }
      setShow(val === message.id)
    },
    [stickOpen]
  )

  if (!show) {
    return
  }

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
      {...(stickOpen && {
        o: 1,
      })}
    >
      <XGroup bg="$color2">
        {topReactions.map((reaction) => {
          if (!reaction) return null
          return <ReactionButton key={reaction.id} message={message} reaction={reaction} />
        })}

        <AddReactionButton message={message} />

        <Separator my="$2" vertical />

        <TooltipSimple label={message.thread ? 'Open Thread' : 'Create Thread'}>
          <Button
            onPress={() => {
              const currentUser = getCurrentUser()
              if (!currentUser) {
                console.error(`no user`)
                return
              }

              const threadId = randomId()

              zero.mutate.thread.insert({
                id: threadId,
                channelId: channel.id,
                messageId: message.id,
                creatorId: currentUser.id,
                description: '',
                title: '',
              })

              zero.mutate.message.update({
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

        <TooltipSimple label="Reply">
          <Button
            chromeless
            size="$2.5"
            br={0}
            onPress={() => {
              messageReplyEmitter.emit({
                type: 'reply',
                messageId: message.id,
              })
            }}
          >
            <Reply size={16} />
          </Button>
        </TooltipSimple>

        <MessageMoreMenu message={message} />
      </XGroup>
    </XStack>
  )
}
