import { useEffect, useState } from 'react'
import { Stack, useLocalSearchParams } from 'one'
import { StatusBar, View } from 'react-native'
import { IconScene } from '../docs-captures/IconScene'
import { ImageScene } from '../docs-captures/ImageScene'
import { MapScene } from '../docs-captures/MapScene'
import { PagerScene } from '../docs-captures/PagerScene'
import { PipScene } from '../docs-captures/PipScene'
import { PortalScene } from '../docs-captures/PortalScene'
import type { DocsSceneName } from '../docs-captures/scenes'

const scenes: Record<DocsSceneName, () => React.ReactNode> = {
  pager: PagerScene,
  portal: PortalScene,
  map: MapScene,
  image: ImageScene,
  icon: IconScene,
  pip: PipScene,
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
