import React from 'react'
import { View, Text, Pressable } from 'react-native'

export default function App() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text testID="hello-word">Hello One!</Text>
      <Pressable testID="go-to-drawer" style={{ padding: 10, marginTop: 20 }}>
        <Text>Go to Drawer Demo</Text>
      </Pressable>
      <Pressable testID="go-to-redirect-test" style={{ padding: 10, marginTop: 10 }}>
        <Text>Go to Redirect Test</Text>
      </Pressable>
    </View>
  )
}
