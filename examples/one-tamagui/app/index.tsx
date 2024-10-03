import OneBall from '~/public/app-icon.png'
import { Image } from '@tamagui/image-next'
import { H1, YStack } from 'tamagui'

export default function HomePage() {
  return (
    <YStack bg="red" h="100%" w="100%" gap="$4" ai="center" jc="center" f={1}>
      <H1>Hello, world</H1>
      <Image src={OneBall} width={128} height={128} />
    </YStack>
  )
}
