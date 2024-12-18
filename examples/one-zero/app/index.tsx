import { Paragraph, YStack } from 'tamagui'
import { useQuery } from '~/src/state/zero'

export default function HomePage() {
  const [messages] = useQuery((q) => q.message.orderBy('createdAt', 'desc'))

  return (
    <YStack f={1}>
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
