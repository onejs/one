import { useEffect, useRef } from 'react'
import { ScrollView, type TamaguiElement, YStack } from 'tamagui'
import type { MessageWithRelations } from '~/config/zero/schema'
import { useAuth } from '~/features/auth/useAuth'
import { useCurrentChannel } from '~/features/state/queries/useServer'
import { MessageItem } from './MessageItem'

export const MessagesList = ({ messages }: { messages: MessageWithRelations[] }) => {
  const channel = useCurrentChannel()
  const { user } = useAuth()
  const scrollViewRef = useRef<TamaguiElement>(null)

  useEffect(() => {
    if (scrollViewRef.current instanceof HTMLElement) {
      scrollViewRef.current.scrollTop = 100_000
    }
  }, [messages])

  return (
    <YStack ov="hidden" f={1}>
      <YStack f={100} />
      <ScrollView ref={scrollViewRef as any}>
        <YStack pt="$10">
          {user
            ? messages.map((message, index) => {
                const lastMessage = messages[index - 1]
                return (
                  <MessageItem
                    hideUser={lastMessage?.senderId === message.senderId}
                    channel={channel}
                    key={message.id}
                    message={message}
                    user={user as any}
                  />
                )
              })
            : null}
        </YStack>
      </ScrollView>
    </YStack>
  )
}
