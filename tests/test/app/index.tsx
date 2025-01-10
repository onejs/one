import { Link } from 'one'
import { Button, H2, YStack } from 'tamagui'
import { ToggleThemeButton } from '../features/theme/ToggleThemeButton'

export default () => (
  <YStack h={600} bg="red" f={1} ai="center" jc="center" gap="$10">
    <H2>Welcome to One</H2>

    <Link asChild href="/sub-page/sub">
      <Button size="$5" id="go-to-sub">
        Go to sub
      </Button>
    </Link>

    <Link asChild href="/sheet">
      <Button>Open Sheet</Button>
    </Link>

    <ToggleThemeButton />
  </YStack>
)
