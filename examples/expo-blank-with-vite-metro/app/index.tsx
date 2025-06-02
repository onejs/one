import React from 'react'
import { Text, View } from 'react-native'

console.warn('hello this is index page 123')

export default function Index() {
  console.warn('index page render')
  return (
    <View
      style={{
        flex: 1,
        alignSelf: 'center',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100%',
      }}
    >
      <Text>Hello world, from One</Text>
    </View>
  )
}
