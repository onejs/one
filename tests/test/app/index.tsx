import { Link, useLoader } from 'one'
import { Button, H2, Paragraph, YStack } from 'tamagui'
import { ToggleThemeButton } from '../features/theme/ToggleThemeButton'

export async function loader() {
  return {
    test: 'hello',
  }
}

export default () => {
  const data = useLoader(loader)

  return (
    <YStack h={600} bg="red" f={1} ai="center" jc="center" gap="$10">
      <H2>Welcome to One</H2>

      <Paragraph id="test-loader">{JSON.stringify(data)}</Paragraph>

      <Link asChild id="go-to-sub" href="/sub-page/sub">
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
}
