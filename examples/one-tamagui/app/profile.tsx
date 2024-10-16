import { Image } from '@tamagui/image-next'
import { Link } from 'one'
import { Text, YStack } from 'tamagui'
import { ToggleThemeButton } from '~/code/ToggleThemeButton'
import oneBall from '~/public/app-icon.png'

export function HomePage() {
  return (
    <YStack bg="$color1" mih="100%" gap="$4" ai="center" jc="center" f={1}>
      <Text fontSize={20}>This is profile page</Text>
      <Link href="/">Go back</Link>
    </YStack>
  )
}
