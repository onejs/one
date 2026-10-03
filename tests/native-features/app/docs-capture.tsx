import { useEffect, useState } from 'react'
import { Stack, useLocalSearchParams } from 'one'
import { StatusBar, View } from 'react-native'
import { IconScene } from '../docs-captures/IconScene'
import { ImageScene } from '../docs-captures/ImageScene'
import { IosActionsScene } from '../docs-captures/IosActionsScene'
import { IosGroupsScene } from '../docs-captures/IosGroupsScene'
import { IosListsScene } from '../docs-captures/IosListsScene'
import { IosPresentationsScene } from '../docs-captures/IosPresentationsScene'
import { IosPickersScene } from '../docs-captures/IosPickersScene'
import { IosProgressScene } from '../docs-captures/IosProgressScene'
import { IosStacksScene } from '../docs-captures/IosStacksScene'
import { IosTextScene } from '../docs-captures/IosTextScene'
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
  'ios-actions': IosActionsScene,
  'ios-pickers': IosPickersScene,
  'ios-progress': IosProgressScene,
  'ios-text': IosTextScene,
  'ios-lists': IosListsScene,
  'ios-stacks': IosStacksScene,
  'ios-groups': IosGroupsScene,
  'ios-presentations': IosPresentationsScene,
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
