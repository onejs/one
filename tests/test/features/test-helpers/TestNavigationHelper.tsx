import { useRouter } from 'one'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Platform, Text, TextInput, View } from 'react-native'

// web version - no persistence with mmkv
// listens for __test_navigate custom events for reliable playwright integration
export function TestNavigationHelper() {
  const [path, setPath] = useState('')
  const [recentPaths, setRecentPaths] = useState<string[]>([])
  const inputRef = useRef<any>(null)
  const router = useRouter()

  const navigateTo = useCallback(
    (target: string) => {
      if (!target) return

      setRecentPaths((prev) => {
        const next = [target, ...prev.filter((p) => p !== target)].slice(0, 3)
        return next
      })

      setTimeout(() => {
        router.navigate(target as any)
      }, 0)
    },
    [router]
  )

  // listen for custom events from playwright tests
  useEffect(() => {
    if (Platform.OS !== 'web') return

    const handler = (e: Event) => {
      const path = (e as CustomEvent).detail?.path
      if (path) navigateTo(path)
    }

    window.addEventListener('__test_navigate', handler)
    return () => window.removeEventListener('__test_navigate', handler)
  }, [navigateTo])

  const handleNavigatePress = useCallback(() => {
    // read DOM value directly as fallback for playwright compatibility
    let target = path
    if (Platform.OS === 'web' && !target) {
      const domInput = document.querySelector(
        '[data-testid="test-navigate-path-input"]'
      ) as HTMLInputElement | null
      if (domInput) target = domInput.value
    }
    navigateTo(target)
  }, [path, navigateTo])

  return (
    <View style={{ borderWidth: 1, borderColor: 'black', padding: 12 }}>
      <TextInput
        ref={inputRef}
        testID="test-navigate-path-input"
        placeholder="Enter path to navigate to..."
        onChangeText={setPath}
      />
      <Button testID="test-navigate" title="Navigate" onPress={handleNavigatePress} />

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
