import React from 'react'
import { View, Text, Pressable } from 'react-native'
import { Link, useRouter } from 'one'

export default function RedirectTestIndex() {
  const router = useRouter()

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text testID="redirect-test-title" style={{ fontSize: 20, marginBottom: 20 }}>
        Redirect Test
      </Text>

      <Link href="/redirect-test/protected" asChild>
        <Pressable testID="go-to-protected" style={{ padding: 10, marginBottom: 10 }}>
          <Text>Go to Protected (Link)</Text>
        </Pressable>
      </Link>

      <Pressable
        testID="go-to-protected-push"
        style={{ padding: 10, marginBottom: 10 }}
        onPress={() => router.push('/redirect-test/protected')}
      >
        <Text>Go to Protected (push)</Text>
      </Pressable>

      <Link href="/redirect-test/always-redirect" asChild>
        <Pressable testID="go-to-always-redirect" style={{ padding: 10, marginBottom: 10 }}>
          <Text>Go to Always Redirect</Text>
        </Pressable>
      </Link>
    </View>
  )
}
