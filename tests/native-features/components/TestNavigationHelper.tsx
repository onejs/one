import { useRouter } from 'one'
import { useCallback, useState } from 'react'
import { Button, TextInput, View } from 'react-native'

export function TestNavigationHelper() {
  const [path, setPath] = useState('')
  const router = useRouter()

  const navigateTo = useCallback(
    (target: string) => {
      if (!target) return
      setTimeout(() => {
        router.navigate(target as any)
      }, 0)
    },
    [router]
  )

  return (
    <View style={{ borderWidth: 1, borderColor: '#ddd', padding: 8, borderRadius: 8 }}>
      <TextInput
        testID="test-navigate-path-input"
        placeholder="path..."
        onChangeText={setPath}
        style={{ padding: 4, fontSize: 12 }}
      />
      <Button testID="test-navigate" title="Go" onPress={() => navigateTo(path)} />
    </View>
  )
}
