import { useCallback, useEffect, useState } from 'react'
import { View, Text, TextInput, Button } from 'react-native'
import { useRouter } from 'one'
import { MMKV } from 'react-native-mmkv'

const storage = new MMKV()
const STORAGE_KEY = 'TestNavigationHelper_recentPaths'

export function TestNavigationHelper() {
  const [path, setPath] = useState('')
  const [recentPaths, setRecentPaths] = useState<string[]>([])

  useEffect(() => {
    const raw = storage.getString(STORAGE_KEY)
    if (raw) {
      try {
        setRecentPaths(JSON.parse(raw))
      } catch {}
    }
  }, [])

  const navigateTo = useCallback((target: string) => {
    if (!target) return

    setRecentPaths((prev) => {
      const next = [target, ...prev.filter((p) => p !== target)].slice(0, 3)
      storage.set(STORAGE_KEY, JSON.stringify(next))
      return next
    })

    setTimeout(() => {
      router.navigate(target as any)
    }, 0)
  }, [])

  const router = useRouter()

  return (
    <View style={{ borderWidth: 1, borderColor: 'black', padding: 12 }}>
      <TextInput
        testID="test-navigate-path-input"
        placeholder="Enter path to navigate to..."
        onChangeText={setPath}
      />
      <Button testID="test-navigate" title="Navigate" onPress={() => navigateTo(path)} />

      {recentPaths.length > 0 && (
        <View>
          <Text>Recent</Text>
          {recentPaths.map((p) => (
            <Button
              key={p}
              testID={`recent-${p}`}
              title={p}
              onPress={() => navigateTo(p)}
            />
          ))}
        </View>
      )}
    </View>
  )
}
