import { useEffect, useState } from 'react'
import { Stack, useLocalSearchParams } from 'one'
import { StatusBar, View } from 'react-native'
import { PagerScene } from '../docs-captures/PagerScene'
import type { DocsSceneName } from '../docs-captures/scenes'

const scenes: Record<DocsSceneName, () => React.ReactNode> = {
  pager: PagerScene,
}

// the background alternates pure white and pure black so scripts/docs-capture.ts can
// recover exact alpha from one capture on each, with the subject left untouched.
export default function DocsCapture() {
  const { scene } = useLocalSearchParams<{ scene: DocsSceneName }>()
  const [dark, setDark] = useState(false)
  useEffect(() => {
    const timer = setInterval(() => setDark((value) => !value), 1500)
    return () => clearInterval(timer)
  }, [])
  const Scene = scene && scenes[scene]
  if (!Scene) throw new Error(`unknown docs scene ${scene}`)
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: dark ? '#000' : '#fff',
      }}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar hidden />
      <View testID="docs-capture-subject" collapsable={false}>
        <Scene />
      </View>
    </View>
  )
}
