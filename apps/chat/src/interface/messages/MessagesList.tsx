import { createEmitter } from '@vxrn/emitter'
import { memo, useEffect, useLayoutEffect, useRef } from 'react'
import { YStack } from 'tamagui'
import { VList, type VListHandle } from 'virtua'
import { useAuth } from '~/better-auth/authClient'
import { useCurrentChannel } from '~/state/channel/useCurrentChannel'
import {
  getUserState,
  updateUserCurrentChannel,
  updateUserOpenThread,
  updateUserSetEditingMessage,
} from '~/state/user'
import type { MessageWithRelations } from '~/db/types'
import { MessageItem, messageItemEmitter } from './MessageItem'
import { router } from 'one'

type MessagesListActions =
  | {
      type: 'move'
      value: 'up' | 'down'
    }
  | {
      type: 'select'
    }
  | {
      type: 'scroll-to-bottom'
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
    const lastMovedIndex = useRef(0)

    messagesListEmitter.use(
      (action) => {
        if (disableEvents) return

        const [_, { activeChannelState }] = getUserState()
        const { focusedMessageId } = activeChannelState || {}
        const focusedMessage = focusedMessageId ? messages[lastMovedIndex.current] : null

        const move = (index: number) => {
          lastMovedIndex.current = index
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
              if (!focusedMessageId || lastMovedIndex.current === 0) {
                move(messages.length - 1)
              } else {
                move(lastMovedIndex.current - 1)
              }
            } else {
              if (lastMovedIndex.current === messages.length - 1) {
                // at bottom
              } else {
                move(lastMovedIndex.current + 1)
              }
            }
            break
          }

          case 'select': {
            if (focusedMessage) {
              if (focusedMessage.thread) {
                updateUserOpenThread(focusedMessage.thread)
              } else {
                updateUserSetEditingMessage(focusedMessage.id)
              }
            }
            break
          }

          case 'scroll-to-bottom': {
            const lastIndex = messages.length - 1
            setTimeout(() => {
              ref.current?.scrollToIndex(lastIndex, {
                smooth: true,
              })
            }, 150)
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

    useEffect(() => {
      router.subscribe((state) => {
        if (!ref.current) return

        const [route] = state.routes
        // @ts-expect-error TODO
        const messageId = route.params?.message
        if (messageId) {
          messageItemEmitter.emit({
            type: 'highlight',
            id: messageId,
          })

          const messageIndex = messages.findIndex((x) => x.id === messageId)
          if (messageIndex >= 0) {
            ref.current.scrollToIndex(messageIndex)
          }
        }
      })
    }, [messages])

    return (
      <YStack ov="hidden" f={10}>
        {!!messages.length && (
          <VList
            ref={ref}
            count={messages.length}
            reverse
            shift={isPrepend.current}
            overscan={10}
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

              if (!message || !user || !channel) {
                return <></>
              }

              return (
                <MessageItem
                  hideUser={lastMessage?.creatorId === message.creatorId && !message.replyingTo}
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
