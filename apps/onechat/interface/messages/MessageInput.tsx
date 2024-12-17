import { useRef, useEffect } from 'react'
import { Input, YStack } from 'tamagui'
import { useAuth } from '~/features/auth/useAuth'
import { useCurrentChannel, useCurrentServer } from '~/features/state/queries/useServer'
import { useCurrentThread } from '~/features/state/queries/useUserState'
import { randomID } from '~/features/state/randomID'
import { mutate } from '~/features/state/zero'
import { messagesListEmitter } from './MessagesList'

export const MessageInput = () => {
  const inputRef = useRef<Input>(null)
  const channel = useCurrentChannel()
  const server = useCurrentServer()
  const thread = useCurrentThread()
  const { user } = useAuth()
  const disabled = !user

  // on channel change, focus input
  useEffect(() => {
    inputRef.current?.focus()
  }, [channel])

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
              messagesListEmitter.emit({
                type: 'move',
                value: 'up',
              })
              break
            }

            case 'ArrowDown': {
              messagesListEmitter.emit({
                type: 'move',
                value: 'down',
              })
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
