import React from 'react'
import { View, Text } from 'react-native'
import { redirect, useLoader } from 'one'
import type { LoaderProps } from 'one'

export async function loader({ request }: LoaderProps) {
  // simulate auth check - always redirect for testing
  throw redirect('/redirect-test/login')
}

export default function ProtectedPage() {
  const data = useLoader(loader)

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text testID="protected-title">Protected Page</Text>
      <Text testID="protected-secret">secret data here</Text>
    </View>
  )
}
