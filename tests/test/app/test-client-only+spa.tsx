import { useState, useEffect } from 'react'
import { Button, H2, Paragraph, YStack } from 'tamagui'

export default function TestClientOnly() {
  const [count, setCount] = useState(0)
  const [browserInfo, setBrowserInfo] = useState<any>(null)

  useEffect(() => {
    // Only import client-only utilities on the client
    if (typeof window !== 'undefined') {
      import('../utils/client-utils').then(({ getBrowserInfo }) => {
        setBrowserInfo(getBrowserInfo())
      })
    }
  }, [])

  return (
    <YStack f={1} ai="center" jc="center" gap="$4" p="$4">
      <H2>Client Only Test Page</H2>
      <Paragraph>This page uses client-only utilities</Paragraph>
      <Paragraph>Count: {count}</Paragraph>
      <Button onPress={() => setCount(count + 1)}>Increment</Button>
      <Paragraph fontSize="$2" color="$gray10">
        Environment: {typeof window !== 'undefined' ? 'client' : 'server'}
      </Paragraph>
      {browserInfo && (
        <Paragraph fontSize="$2" color="$gray10">
          Browser: {browserInfo.language}
        </Paragraph>
      )}
    </YStack>
  )
}