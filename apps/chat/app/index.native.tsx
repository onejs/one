import { H3, YStack } from 'tamagui'
import { Sidebar } from '~/interface/sidebar/Sidebar'

export default function HomePage() {
  return (
    <YStack pt="$10" px="$4">
      <H3>Servers</H3>
      <Sidebar />
    </YStack>
  )
}
