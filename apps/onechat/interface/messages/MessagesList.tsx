import { memo, useEffect, useLayoutEffect, useRef } from 'react'
import { YStack } from 'tamagui'
import { VList, type VListHandle } from 'virtua'
import type { MessageWithRelations } from '~/config/zero/schema'
import { useAuth } from '~/features/auth/useAuth'
import { useCurrentChannel } from '~/features/state/queries/useServer'
import { getUserState, updateUserCurrentChannel } from '~/features/state/queries/useUserState'
import { createEmitter } from '~/helpers/emitter'
import { MessageItem } from './MessageItem'

type MessagesListActions = {
  type: 'move'
  value: 'up' | 'down'
}

export const [messagesListEmit, _, useEmitter] = createEmitter<MessagesListActions>()

export const MessagesList = memo(
  ({ messages, disableEvents }: { messages: MessageWithRelations[]; disableEvents?: boolean }) => {
    const channel = useCurrentChannel()
    const { user } = useAuth()
    const shouldStickToBottom = useRef(true)
    const ref = useRef<VListHandle>(null)
    const isPrepend = useRef(false)
    const lastIndex = useRef(0)

    useEmitter(
      (action) => {
        if (disableEvents) {
          return
        }

        const [_, { activeChannelState }] = getUserState()
        if (!activeChannelState) return
        const { focusedMessageId } = activeChannelState

        const move = (index: number) => {
          lastIndex.current = index
          updateUserCurrentChannel({
            focusedMessageId: messages[index].id,
          })
        }

        switch (action.type) {
          case 'move': {
            if (!messages.length) {
              console.warn('no messages')
              return
            }

            const { value } = action

            if (value === 'up') {
              if (!focusedMessageId || lastIndex.current === 0) {
                move(messages.length - 1)
              } else {
                move(lastIndex.current - 1)
              }
            } else {
              if (lastIndex.current === messages.length - 1) {
                // at bottom
              } else {
                move(lastIndex.current + 1)
              }
            }
            break
          }
        }
      },
      [disableEvents, messages]
    )

    useLayoutEffect(() => {
      isPrepend.current = false
    })

    useEffect(() => {
      if (!ref.current) return
      if (!shouldStickToBottom.current) return

      ref.current.scrollToIndex(messages.length - 1, { align: 'end' })
    }, [messages.length])

    if (!messages.length) {
      return null
    }

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
                disableEvents={disableEvents}
              />
            )
          }}
        </VList>
      </YStack>
    )
  }
)
