import React from 'react'
import { View, Text } from 'react-native'
import { Link } from 'one'

export default function LoginPage() {
  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text testID="login-title" style={{ fontSize: 20, marginBottom: 20 }}>
        Login Page
      </Text>
      <Text testID="login-message">You were redirected here</Text>

      <Link href="/redirect-test" asChild>
        <Text testID="back-to-redirect-test" style={{ padding: 10, marginTop: 10 }}>
          Back to Redirect Test
        </Text>
      </Link>
    </View>
  )
}
