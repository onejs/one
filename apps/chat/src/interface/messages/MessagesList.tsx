import { memo, useEffect, useLayoutEffect, useRef } from 'react'
import { YStack } from 'tamagui'
import { VList, type VListHandle } from 'virtua'
import type { MessageWithRelations } from '~/zero/schema'
import { useAuth } from '~/better-auth/authClient'
import { useCurrentChannel } from '~/state/server'
import { getUserState, updateUserCurrentChannel, updateUserOpenThread } from '~/state/user'
import { createEmitter } from '@vxrn/emitter'
import { MessageItem } from './MessageItem'

type MessagesListActions =
  | {
      type: 'move'
      value: 'up' | 'down'
    }
  | {
      type: 'select'
    }

export const messagesListEmitter = createEmitter<MessagesListActions>()

export const MessagesList = memo(
  ({
    messages,
    disableEvents,
  }: { messages: readonly MessageWithRelations[]; disableEvents?: boolean }) => {
    const channel = useCurrentChannel()
    const { user } = useAuth()
    const shouldStickToBottom = useRef(true)
    const ref = useRef<VListHandle>(null)
    const isPrepend = useRef(false)
    const lastIndex = useRef(0)

    messagesListEmitter.use(
      (action) => {
        if (disableEvents) return

        const [_, { activeChannelState }] = getUserState()
        const { focusedMessageId } = activeChannelState || {}
        const focusedMessage = focusedMessageId ? messages[lastIndex.current] : null

        const move = (index: number) => {
          lastIndex.current = index
          updateUserCurrentChannel({
            focusedMessageId: messages[index].id,
          })
          ref.current?.scrollToIndex(index, { align: 'nearest' })
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

          case 'select': {
            if (focusedMessage) {
              if (focusedMessage.thread) {
                updateUserOpenThread(focusedMessage.thread[0])
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

    return (
      <YStack ov="hidden" f={10}>
        {!!messages.length && (
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
                  disableEvents={disableEvents}
                />
              )
            }}
          </VList>
        )}
      </YStack>
    )
  }
)
