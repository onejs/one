import { useState } from 'react'
import { Button, H1, H3, Input, isWeb, Paragraph, SizableText, XStack, YStack } from 'tamagui'
import { authClient, useAuth } from '~/better-auth/authClient'
import { Avatar } from '~/interface/Avatar'
import { isTauri } from '~/tauri/constants'
import { randomID } from '~/zero/randomId'
import { useQuery, zero } from '~/zero/zero'

export default function HomePage() {
  const [messages] = useQuery((q) => q.message.orderBy('createdAt', 'desc'))
  const { user, jwtToken, session } = useAuth()
  const [text, setText] = useState('')
  const existingUser = useQuery((q) => q.user)[0][0]

  return (
    <YStack
      flex={1}
      p="$4"
      gap="$4"
      items="flex-start"
      maxW={600}
      width="100%"
      self="center"
      $platform-ios={{ pt: '$10' }}
    >
      <H1>Welcome</H1>

      {user ? (
        <XStack items="center" gap="$4">
          <Avatar image={user.image || ''} />
          <SizableText>{user.name}</SizableText>

          <Button onPress={() => authClient.signOut()}>Logout</Button>

          {isWeb && !isTauri && jwtToken && (
            <a href={`one-chat://finish-auth?token=${session?.token}`}>
              <Button>Login in Tauri</Button>
            </a>
          )}
        </XStack>
      ) : (
        <Button
          onPress={() => {
            authClient.signIn.social({
              provider: 'github',
            })
          }}
        >
          Login with Github
        </Button>
      )}

      <YStack width="100%" gap="$4" p="$4" borderColor="$color2" borderWidth={1} rounded="$4">
        <Input onChangeText={setText} />

        <Button
          onPress={async () => {
            const existing = user?.id || existingUser?.id
            let userId = existing || randomID()

            if (!existing) {
              // for now just insert some random user!
              await zero.mutate.user.insert({
                id: userId,
                email: '',
                image: '',
                username: 'firstuser',
                name: 'First User',
                state: {},
                updatedAt: new Date().getTime(),
                createdAt: new Date().getTime(),
              })
            }

            zero.mutate.message.insert({
              id: randomID(),
              senderId: userId,
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
