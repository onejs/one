import { H1, Image, Paragraph, YStack } from 'tamagui'
import oneBall from '../public/app-icon.png'

export default () => (
  <YStack mih={900} f={10} bg="$color2" p="$4" gap="$6">
    <H1>Native Sheet</H1>

    <Paragraph size="$5">
      Ad labore sunt deserunt mollit id amet aliquip reprehenderit nisi sint fugiat.
    </Paragraph>

    <Image src={oneBall} width={300} height={300} />
  </YStack>
)
