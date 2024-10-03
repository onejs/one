import { Image } from '@tamagui/image-next'
import { Text, YStack } from 'tamagui'
import oneBall from '~/public/app-icon.png'

export default function HomePage() {
  return (
    <YStack gap="$4" ai="center" jc="center" f={1}>
      <Text fontSize={20}>Hello, world</Text>
      <Image src={oneBall} width={128} height={128} />
    </YStack>
  )
}
