import { type LoaderProps, setResponseHeaders, useLoader } from 'one'
import { Text, View } from 'tamagui'

export async function loader(props: LoaderProps) {
  // set a cookie via setResponseHeaders
  await setResponseHeaders((headers) => {
    headers.set('Set-Cookie', 'test-cookie=hello; Path=/; HttpOnly')
  })

  return {
    message: 'Cookie test page',
    timestamp: Date.now(),
  }
}

export default function CookieTest() {
  const data = useLoader(loader)

  return (
    <View
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      height="100vh"
      gap={16}
    >
      <Text id="message">{data.message}</Text>
      <Text id="timestamp">{data.timestamp}</Text>
    </View>
  )
}
