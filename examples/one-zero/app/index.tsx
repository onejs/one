import { useCallback, useState } from 'react'
import {
  Button,
  H1,
  H3,
  Input,
  isWeb,
  Paragraph,
  SizableText,
  XStack,
  YStack,
} from 'tamagui'
import { authClient, useAuth } from '~/better-auth/authClient'
import { isTauri } from '~/tauri/constants'
import { Avatar } from '~/interface/Avatar'
import { useQuery, zero } from '~/zero/zero'
import { randomID } from '~/zero/randomId'

export default function HomePage() {
  const { user, token, session } = useAuth()
  const [text, setText] = useState('')

  const [messages] = useQuery((q) =>
    q.message.related('sender').orderBy('createdAt', 'desc')
  )

  const handleSubmit = useCallback(async () => {
    zero.mutate.message.insert({
      id: randomID(),
      senderId: user?.id,
      content: text,
      createdAt: new Date().getTime(),
    })
  }, [user, text])

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

          {isWeb && !isTauri && token && (
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

      <YStack
        width="100%"
        gap="$4"
        p="$4"
        borderColor="$color2"
        borderWidth={1}
        rounded="$4"
      >
        <Input onChangeText={setText} onSubmitEditing={handleSubmit} />
        <Button onPress={handleSubmit}>Post</Button>
      </YStack>

      <H3>Messages</H3>

      {messages.map((message) => {
        return (
          <XStack key={message.id}>
            <Paragraph>
              <SizableText fontWeight="700">
                {message.sender ? message.sender.name : 'Anonymous'}
              </SizableText>
              : {message.content}
            </Paragraph>
          </XStack>
        )
      })}
    </YStack>
  )
}
