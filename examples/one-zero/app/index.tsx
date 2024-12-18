import { Button, H1, Input, Paragraph, YStack } from 'tamagui'
import { githubSignIn } from '~/src/better-auth/githubSignIn'
import { useAuth } from '~/src/better-auth/useAuth'
import { randomID } from '~/src/state/randomID'
import { mutate, useQuery } from '~/src/state/zero'

export default function HomePage() {
  const [messages] = useQuery((q) => q.message.orderBy('createdAt', 'desc'))
  const { user } = useAuth()

  return (
    <YStack f={1} p="$4" gap="$4" ai="flex-start" maw={600} als="center">
      <H1>Welcome to One</H1>

      {!user && <Button onPress={githubSignIn}>Login with Github</Button>}

      <YStack w="100%" gap="$4" p="$4" bc="$color2" bw={1} br="$4">
        <Input
          onSubmitEditing={(e) => {
            mutate.message.insert({
              id: randomID(),
              senderId: randomID(),
              content: e.nativeEvent.text,
              createdAt: new Date().getTime(),
            })
          }}
        />

        <Button>Post</Button>
      </YStack>

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
