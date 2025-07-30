import 'server-only'
import { useLoader } from 'one'
import { H2, Paragraph, YStack } from 'tamagui'
import { getServerTime, getServerEnvironment } from '../utils/server-utils'

export async function loader() {
  // This loader should only run on the server
  const serverInfo = getServerEnvironment()
  return {
    message: 'This data was loaded on the server',
    timestamp: getServerTime(),
    ...serverInfo
  }
}

export default function TestServerOnly() {
  const data = useLoader(loader)

  return (
    <YStack f={1} ai="center" jc="center" gap="$4" p="$4">
      <H2>Server Only Test Page</H2>
      <Paragraph>This page imports 'server-only' at the top</Paragraph>
      <Paragraph>Loaded data: {JSON.stringify(data, null, 2)}</Paragraph>
    </YStack>
  )
}