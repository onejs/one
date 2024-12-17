import { useEffect, useLayoutEffect, useRef } from 'react'
import { YStack } from 'tamagui'
import { VList, type VListHandle } from 'virtua'
import type { MessageWithRelations } from '~/config/zero/schema'
import { useAuth } from '~/features/auth/useAuth'
import { useCurrentChannel } from '~/features/state/queries/useServer'
import { MessageItem } from './MessageItem'

export const MessagesList = ({ messages }: { messages: MessageWithRelations[] }) => {
  const channel = useCurrentChannel()
  const { user } = useAuth()

  const shouldStickToBottom = useRef(true)
  const ref = useRef<VListHandle>(null)
  const isPrepend = useRef(false)

  // useEffect(() => {
  //   if (scrollViewRef.current instanceof HTMLElement) {
  //     scrollViewRef.current.scrollTop = 100_000
  //   }
  // }, [messages])

  useLayoutEffect(() => {
    isPrepend.current = false
  })

  useEffect(() => {
    if (!ref.current) return
    if (!shouldStickToBottom.current) return

    ref.current.scrollToIndex(messages.length - 1, { align: 'end' })
  }, [messages.length])

  return (
    <YStack ov="hidden" f={1}>
      <VList
        ref={ref}
        count={messages.length}
        reverse
        shift={isPrepend.current}
        style={{
          flex: 1,
        }}
        onScroll={(offset) => {
          if (!ref.current) return
          shouldStickToBottom.current =
            offset - ref.current.scrollSize + ref.current.viewportSize >=
            // FIXME: The sum may not be 0 because of sub-pixel value when browser's window.devicePixelRatio has decimal value
            -1.5
        }}
      >
        {(index) => {
          console.warn('render', index)
          const message = messages[index]
          const lastMessage = messages[index - 1]

          if (!message || !user) {
            return <></>
          }

          return (
            <MessageItem
              hideUser={lastMessage?.senderId === message.senderId}
              channel={channel}
              key={message.id}
              message={message}
              user={user as any}
            />
          )
        }}
      </VList>
    </YStack>
  )
}
