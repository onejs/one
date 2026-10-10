import { useCallback, useState, useEffect } from 'react'
import { Clipboard, Pressable, TextInput, View } from 'react-native'
import { useRouter } from 'one'
import { useSafeAreaInsets, initialWindowMetrics } from 'react-native-safe-area-context'

export function QuickNavigatePixel() {
  const [isMounted, setIsMounted] = useState(false)
  const [path, setPath] = useState('')

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const safeAreaInsets = (() => {
    try {
      const insets = useSafeAreaInsets()
      if (insets) return insets
    } catch {}

    return initialWindowMetrics?.insets
  })()

  const router = useRouter()

  const navigateClipboard = useCallback(async () => {
    try {
      const target = await Clipboard.getString()

      if (!target) {
        console.warn('QuickNavigatePixel: nothing in clipboard')
        return
      }

      router.navigate(target as any)
    } catch (e) {
      console.warn(
        `QuickNavigatePixel: failed to navigate ${e instanceof Error ? e.message : 'unknown error'}`
      )
    }
  }, [router])

  const navigateInput = useCallback(() => {
    if (path) {
      router.navigate(path as any)
    }
  }, [path, router])

  if (!isMounted) {
    return null
  }

  return (
    <>
      <Pressable
        testID="quick-navigate-pixel"
        style={{
          position: 'absolute',
          bottom: (safeAreaInsets?.bottom || 0) + 1,
          right: (safeAreaInsets?.right || 0) + 1,
          width: 5,
          height: 5,
        }}
        onPress={navigateClipboard}
      />
      <View
        style={{
          position: 'absolute',
          top: (safeAreaInsets?.top || 0) + 1,
          right: (safeAreaInsets?.right || 0) + 1,
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
          onPress={navigateInput}
          style={{ width: 5, height: 5 }}
        />
      </View>
    </>
  )
}
