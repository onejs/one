import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { One } from 'one'

export default function OneNativeLaunchScreen() {
  const [hiddenAgain, setHiddenAgain] = useState(false)

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Text>Launch screen fixture: visible</Text>
      <Text>Hide again: {String(hiddenAgain)}</Text>
      <Pressable testID="one-native-launch-screen-hide-again" onPress={() => {
        One.LaunchScreen.hide()
        setHiddenAgain(true)
      }}>
        <Text>Hide launch screen again</Text>
      </Pressable>
    </View>
  )
}
