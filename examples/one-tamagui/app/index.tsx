import { Image } from '@tamagui/image-next'
import { Text, YStack } from 'tamagui'
import { Link } from 'one'
import { ToggleThemeButton } from '~/interface/ToggleThemeButton'
import oneBall from '~/app-icon.png'
import { version } from 'react'

export function HomePage() {
  return (
    <YStack bg="$color1" minH="100%" gap="$4" px="$4" items="center" justify="center" flex={1}>
      <Text fontSize="$8" text="center">
        Hello, One
      </Text>

      <Image src={oneBall} width={128} height={128} />

      <YStack items="center" gap="$6">
        <Text fontSize="$5" lineHeight="$5" text="center" color="$color11">
          Edit <Text>app/index.tsx</Text> to change this screen and then come back to see your
          edits.
        </Text>
        <Text fontSize="$5" lineHeight="$5" text="center" color="$color11">
          Read{' '}
          <Link href="https://onestack.dev/docs/introduction">
            <Text color="$yellow10" $platform-web={{ fontSize: 'inherit' }}>
              the docs
            </Text>
          </Link>{' '}
          to discover what to do next.
        </Text>

        <Text fontSize="$5" lineHeight="$5" text="center" color="$color11">
          React version: {version}
        </Text>

        <ToggleThemeButton />
      </YStack>
    </YStack>
  )
}
