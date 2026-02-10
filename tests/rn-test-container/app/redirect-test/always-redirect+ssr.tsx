import React from 'react'
import { View, Text } from 'react-native'
import { redirect, useLoader } from 'one'
import type { LoaderProps } from 'one'

export async function loader({ request }: LoaderProps) {
  // redirect using return instead of throw
  return redirect('/redirect-test')
}

export default function AlwaysRedirectPage() {
  const data = useLoader(loader)

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text testID="always-redirect-title">Should Not See This</Text>
    </View>
  )
}
