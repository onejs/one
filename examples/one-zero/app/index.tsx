import { useState } from 'react'
import { Button, H1, H3, Input, Paragraph, SizableText, XStack, YStack } from 'tamagui'
import { githubSignIn } from '~/src/better-auth/githubSignIn'
import { useAuth } from '~/src/better-auth/useAuth'
import { Avatar } from '~/src/interface/Avatar'
import { randomID } from '~/src/state/randomID'
import { mutate, useQuery } from '~/src/state/zero'

export default function HomePage() {
  const [messages] = useQuery((q) => q.message.orderBy('createdAt', 'desc'))
  const { user } = useAuth()
  const [text, setText] = useState('')

  return (
    <YStack f={1} p="$4" gap="$4" ai="flex-start" maw={600} w="100%" als="center">
      <H1>Welcome</H1>

      {user ? (
        <XStack ai="center" gap="$4">
          <Avatar image={user.image || ''} />
          <SizableText>{user.name}</SizableText>
        </XStack>
      ) : (
        <Button onPress={githubSignIn}>Login with Github</Button>
      )}

      <YStack w="100%" gap="$4" p="$4" bc="$color2" bw={1} br="$4">
        <Input onChangeText={setText} />

        <Button
          onPress={() => {
            mutate.message.insert({
              id: randomID(),
              senderId: randomID(),
              content: text,
              createdAt: new Date().getTime(),
            })
          }}
        >
          Post
        </Button>
      </YStack>

      <H3>Messages</H3>

      {messages.map((message) => {
        return (
          <YStack key={message.id}>
            <Paragraph>{message.content}</Paragraph>
          </YStack>
        )
      })}
    </YStack>
  )
}
