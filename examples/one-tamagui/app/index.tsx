import { Image } from '@tamagui/image-next'
import { Text, YStack } from 'tamagui'
import { Link } from 'one'
import { ToggleThemeButton } from '~/interface/ToggleThemeButton'
import oneBall from '~/app-icon.png'
import { version } from 'react'

export function HomePage() {
  return (
    <YStack bg="$color1" mih="100%" gap="$4" px="$4" ai="center" jc="center" f={1}>
      <Text fontSize="$8" textAlign="center">
        Hello, One.
      </Text>

      <Image src={oneBall} width={128} height={128} />

      <YStack ai="center" gap="$6">
        <Text fontSize="$5" lineHeight="$5" textAlign="center" color="$gray11">
          Edit <Text>app/index.tsx</Text> to change this screen and then come back to see your
          edits.
        </Text>
        <Text fontSize="$5" lineHeight="$5" textAlign="center" color="$gray11">
          Read{' '}
          <Link href="https://onestack.dev/docs/introduction">
            <Text color="$yellow10">the docs</Text>
          </Link>{' '}
          to discover what to do next.
        </Text>

        <Text fontSize="$5" lineHeight="$5" textAlign="center" color="$gray11">
          React version: {version}
        </Text>

        <ToggleThemeButton />
      </YStack>
    </YStack>
  )
}
