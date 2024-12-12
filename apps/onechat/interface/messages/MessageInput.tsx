import { useRef, useEffect } from 'react'
import { Input, YStack } from 'tamagui'
import { useAuth } from '~/features/auth/useAuth'
import { useCurrentChannel, useCurrentServer } from '~/features/state/queries/useServer'
import { randomID } from '~/features/state/randomID'
import { mutate } from '~/features/state/zero'

export const MessageInput = () => {
  const inputRef = useRef<Input>(null)
  const channel = useCurrentChannel()
  const server = useCurrentServer()
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
          console.log('type', key)

          switch (key) {
            case 'ArrowUp': {
            }
          }
        }}
        onSubmitEditing={(e) => {
          if (!user) {
            console.error('no user')
            return
          }

          inputRef.current?.clear()
          mutate.message.insert({
            id: randomID(),
            channelId: channel.id,
            content: e.nativeEvent.text,
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
