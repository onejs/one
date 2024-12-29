import { Button, YStack } from 'tamagui'
import { getRandomItem } from '~/helpers/getRandomItem'
import { randomID } from '~/helpers/randomID'
import { showToast } from '~/interface/toast/Toast'
import { useCurrentChannel } from '~/state/server'
import { resolve } from '~/zero/resolve'
import { zero, type Message } from '~/zero'

export const DevTools = () => {
  const channel = useCurrentChannel()

  return (
    <YStack f={1} p="$4" gap="$2">
      <Button
        onPress={async () => {
          const friendships = await resolve(zero.query.friendship)
          for (const friendship of friendships) {
            await zero.mutate.friendship.update({
              ...friendship,
              accepted: true,
            })
          }
          alert('done')
        }}
      >
        All Friendships: Accept
      </Button>

      <Button
        onPress={async () => {
          if (!channel) {
            showToast('No channel!')
            return
          }

          const users = await resolve(zero.query.user.limit(5))

          const messages = new Array(100).fill(0).map((_, index) => {
            return {
              channelID: channel.id,
              content: `Lorem ipsum dolo`,
              createdAt: new Date().getTime() - index * 60 * 1000,
              deleted: false,
              id: randomID(),
              // @ts-expect-error
              creatorID: getRandomItem(users)!.id,
              serverID: channel.serverID,
              isThreadReply: false,
              threadID: null,
              updatedAt: null,
            } satisfies Message
          })

          zero.mutateBatch(async (tx) => {
            for (const message of messages) {
              await tx.message.insert(message)
            }
          })
        }}
      >
        Current Channel: insert 100 messages
      </Button>
    </YStack>
  )
}
