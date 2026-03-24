import { useCallback, useState, useEffect } from 'react'
import { Pressable } from 'react-native'
import { useRouter } from 'one'
import * as Clipboard from 'expo-clipboard'
import { useSafeAreaInsets, initialWindowMetrics } from 'react-native-safe-area-context'

export function QuickNavigatePixel() {
  const [isMounted, setIsMounted] = useState(false)

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

  const navigate = useCallback(async () => {
    try {
      const target = await Clipboard.getStringAsync()

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

  if (!isMounted) {
    return null
  }

  return (
    <Pressable
      testID="quick-navigate-pixel"
      style={{
        position: 'absolute',
        bottom: (safeAreaInsets?.bottom || 0) + 1,
        right: (safeAreaInsets?.right || 0) + 1,
        width: 5,
        height: 5,
      }}
      onPress={navigate}
    />
  )
}
