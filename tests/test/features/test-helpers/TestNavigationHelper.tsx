import { useState } from 'react'
import { View, TextInput, Button } from 'react-native'
import { useRouter } from 'one'

export function TestNavigationHelper() {
  const [path, setPath] = useState('')

  const router = useRouter()

  return (
    <View>
      <TextInput
        testID="test-navigate-path-input"
        placeholder="Enter path to navigate to..."
        onChangeText={setPath}
      />
      <Button
        testID="test-navigate"
        title="Navigate"
        onPress={() => router.navigate(path as any)}
      />
    </View>
  )
}
