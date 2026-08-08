import { useRouter } from 'one'
import { useCallback, useState } from 'react'
import { Pressable, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export function QuickNavigateInput() {
  const [path, setPath] = useState('')
  const router = useRouter()
  const safeAreaInsets = useSafeAreaInsets()

  const navigate = useCallback(() => {
    if (path) {
      router.navigate(path as any)
    }
  }, [path, router])

  return (
    <View
      style={{
        position: 'absolute',
        top: safeAreaInsets.top + 1,
        right: safeAreaInsets.right + 1,
        width: 10,
        height: 5,
        flexDirection: 'row',
      }}
    >
      <TextInput
        testID="quick-navigate-path-input"
        value={path}
        onChangeText={setPath}
        style={{ width: 5, height: 5, padding: 0 }}
      />
      <Pressable
        testID="quick-navigate-submit"
        onPress={navigate}
        style={{ width: 5, height: 5 }}
      />
    </View>
  )
}
