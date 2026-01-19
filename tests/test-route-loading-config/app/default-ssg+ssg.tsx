import { Link, useLoader } from 'one'
import { Text, YStack, H1, Paragraph } from 'tamagui'

// no config export - uses default behavior based on render mode
// SSG pages default to blocking

export async function loader() {
  await new Promise((resolve) => setTimeout(resolve, 300))
  return {
    title: 'Default SSG Page',
    mode: 'ssg',
    defaultBehavior: 'blocking',
    loadTime: 300,
    timestamp: Date.now(),
  }
}

export default function DefaultSSGPage() {
  const data = useLoader(loader)

  return (
    <YStack padding="$4" gap="$4">
      <H1 id="page-title">{data.title}</H1>
      <Paragraph id="render-mode">Render mode: {data.mode}</Paragraph>
      <Paragraph id="default-behavior">Default behavior: {data.defaultBehavior}</Paragraph>
      <Paragraph id="load-time">Load time: {data.loadTime}ms</Paragraph>
      <Paragraph id="page-timestamp">Loaded at: {data.timestamp}</Paragraph>

      <Text>
        This SSG page has no config export, so it uses the default behavior. SSG/SSR pages default
        to <Text fontWeight="bold">blocking</Text> navigation.
      </Text>

      <YStack gap="$2" marginTop="$4">
        <Link href="/" id="nav-to-home">
          <Text color="$blue10">Back to Home</Text>
        </Link>
        <Link href="/default-spa" id="nav-to-default-spa">
          <Text color="$purple10">Default SPA</Text>
        </Link>
      </YStack>
    </YStack>
  )
}
