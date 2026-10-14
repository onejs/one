import { useCallback, useEffect, useState } from 'react'
import { Clipboard, Platform, Pressable, TextInput, View } from 'react-native'
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
    // the input lives in the root layout, so a kept route would prefix the next one.
    setPath('')
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
          // keep navigation below native dev banners and above the software keyboard.
          top: (safeAreaInsets?.top || 0) + 64,
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
          // the android runner types with adb key events; a keyboard raised
          // for this hidden input would cover later taps, even after resume.
          showSoftInputOnFocus={Platform.OS !== 'android'}
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
