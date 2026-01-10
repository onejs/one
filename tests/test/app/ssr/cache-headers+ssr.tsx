import { type LoaderProps, setResponseHeaders, useLoader } from 'one'
import { Text, View } from 'tamagui'

export async function loader(props: LoaderProps) {
  // Set ISR-style cache headers
  await setResponseHeaders((headers) => {
    headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
    headers.set('X-Custom-Header', 'test-value')
  })

  return {
    timestamp: Date.now(),
    path: props.path,
  }
}

export default function CacheHeadersTest() {
  const data = useLoader(loader)

  return (
    <View
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      height="100vh"
      gap={16}
    >
      <Text>Cache Headers Test</Text>
      <Text id="timestamp">{data.timestamp}</Text>
      <Text id="path">{data.path}</Text>
    </View>
  )
}
