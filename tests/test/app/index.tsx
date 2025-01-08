import { Link } from 'one'
import { Text, View } from 'react-native'
import { Button, H2, YStack } from 'tamagui'
import { ToggleThemeButton } from '../features/theme/ToggleThemeButton'

export default () => (
  <YStack f={1} ai="center" jc="center" gap="$6">
    <H2>Welcome to One</H2>

    <Link asChild href="/sub-page/sub">
      <Button>Go to sub</Button>
    </Link>
    <Link asChild href="/sheet">
      <Button>Open Sheet</Button>
    </Link>

    <ToggleThemeButton />
  </YStack>
)
