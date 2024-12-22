import { IndentIncrease, Reply } from '@tamagui/lucide-icons'
import { Button, Separator, TooltipSimple, XGroup, XStack } from 'tamagui'
import { randomID } from '~/helpers/randomID'
import { getCurrentUser, updateUserOpenThread } from '~/state/user'
import type { Channel, MessageWithRelations } from '~/zero/schema'
import { mutate, useQuery } from '~/zero/zero'
import { AddReactionButton } from './AddReactionButton'
import { MessageMoreMenu } from './MessageMoreMenu'
import { ReactionButton } from './MessageReactions'
import { messageActionBarStickOpen, messageHover } from './constants'
import { useState } from 'react'

export const MessageActionBar = ({
  message,
  channel,
}: {
  message: MessageWithRelations
  channel: Channel
}) => {
  const [topReactions] = useQuery((q) => q.reaction.limit(3).orderBy('createdAt', 'desc'))
  const [show, setShow] = useState(false)

  messageHover.use((val) => {
    setShow(val === message.id)
  })

  const stickOpen = messageActionBarStickOpen.useValue()

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

                const threadID = randomID()

                mutate.thread.insert({
                  id: threadID,
                  channelID: channel.id,
                  messageID: message.id,
                  creatorID: currentUser.id,
                  description: '',
                  title: '',
                })

                mutate.message.update({
                  id: message.id,
                  threadID,
                  isThreadReply: false,
                })

                updateUserOpenThread({
                  id: threadID,
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

        <MessageMoreMenu message={message} />
      </XGroup>
    </XStack>
  )
}
