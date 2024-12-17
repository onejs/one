import { useEffect, useRef } from 'react'
import { Input, YStack } from 'tamagui'
import { useAuth } from '~/features/auth/useAuth'
import { useCurrentChannel, useCurrentServer } from '~/features/state/queries/useServer'
import {
  getDerivedUserState,
  updateUserCurrentChannel,
  useCurrentThread,
} from '~/features/state/queries/useUserState'
import { randomID } from '~/features/state/randomID'
import { mutate } from '~/features/state/zero'
import { messagesListEmit } from './MessagesList'

let mainInputRef: Input | null = null

export const MessageInput = ({ inThread }: { inThread?: boolean }) => {
  const inputRef = useRef<Input>(null)
  const channel = useCurrentChannel()
  const server = useCurrentServer()
  const thread = useCurrentThread()
  const { user } = useAuth()
  const disabled = !user

  // on channel change, focus input
  useEffect(() => {
    if (!inThread) {
      mainInputRef = inputRef.current
    }

    inputRef.current?.focus()
  }, [channel, inThread])

  return (
    <YStack btw={1} bc="$color4" p="$2">
      <Input
        ref={inputRef}
        disabled={disabled}
        placeholder={disabled ? 'Sign in to chat...' : ''}
        pe={disabled ? 'none' : 'auto'}
        onKeyPress={(e) => {
          const key = e.nativeEvent.key
          switch (key) {
            case 'ArrowUp': {
              messagesListEmit({
                type: 'move',
                value: 'up',
              })
              break
            }

            case 'ArrowDown': {
              messagesListEmit({
                type: 'move',
                value: 'down',
              })
              break
            }

            case 'Enter': {
              messagesListEmit({
                type: 'select',
              })
              break
            }

            case 'Escape': {
              inputRef.current?.blur()

              if (getDerivedUserState().activeThread) {
                updateUserCurrentChannel({
                  openedThreadId: undefined,
                })

                if (mainInputRef) {
                  mainInputRef.focus()
                }
              }
              break
            }
          }
        }}
        onSubmitEditing={(e) => {
          if (!user) {
            console.error('no user')
            return
          }

          const content = e.nativeEvent.text

          if (!content) {
            return
          }

          inputRef.current?.clear()
          mutate.message.insert({
            id: randomID(),
            channelId: channel.id,
            threadId: thread?.id,
            isThreadReply: !!thread,
            content,
            createdAt: new Date().getTime(),
            deleted: false,
            senderId: user!.id,
            serverId: server.id,
          })

          setTimeout(() => {
            inputRef.current?.focus()
          }, 40)
        }}
      />
    </YStack>
  )
}
