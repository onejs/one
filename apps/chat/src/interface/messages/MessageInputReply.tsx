import { X } from '@tamagui/lucide-icons'
import { useState } from 'react'
import { Button, SizableText, XStack } from 'tamagui'
import { useQuery } from '~/zero'
import { Avatar } from '../Avatar'
import { messageInputEmitter, messageReplyEmitter } from './emitters'
import { UserInline } from '~/interface/users/UserInline'

export const MessageInputReply = () => {
  const [replyId, setReplyId] = useState('')
  const message = useQuery((q) =>
    q.message.where('id', replyId).related('sender', (q) => q.one())
  )[0][0]
  const sender = message?.sender

  messageReplyEmitter.use((value) => {
    switch (value.type) {
      case 'reply': {
        setReplyId(value.messageId)
        messageInputEmitter.emit({ type: 'focus' })
        break
      }
      case 'cancel': {
        setReplyId('')
        break
      }
    }
  })

  if (!message || !sender) {
    return null
  }

  return (
    <XStack bg="$color6" py="$1.5" px="$2" ai="center" gap="$3" br="$3">
      <Button
        onPress={() => {
          messageReplyEmitter.emit({ type: 'cancel' })
        }}
        size="$1"
        circular
        icon={X}
      />

      <SizableText size="$3">Replying to</SizableText>

      <XStack gap="$2">
        <UserInline user={message.sender} />
      </XStack>
    </XStack>
  )
}
