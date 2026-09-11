import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { HmrProbeChild } from '../features/hmr/HmrProbeChild'
import { hmrProbeWorkspaceValue } from '@vxrn/test-package'

declare global {
  var __ONE_HMR_ROUTE_GENERATION__: number | undefined
}

const routeGeneration = (globalThis.__ONE_HMR_ROUTE_GENERATION__ ?? 0) + 1
globalThis.__ONE_HMR_ROUTE_GENERATION__ = routeGeneration

export default function HmrProbe() {
  const [generation] = useState(routeGeneration)
  const [count, setCount] = useState(0)

  return (
    <View>
      <Text testID="route-hmr-version">route-v1</Text>
      <Text testID="route-hmr-generation">generation:{generation}</Text>
      <Text testID="route-hmr-count">count:{count}</Text>
      <Pressable testID="route-hmr-bump" onPress={() => setCount((c) => c + 1)}>
        <Text>bump</Text>
      </Pressable>
      <Text testID="workspace-hmr-version">{hmrProbeWorkspaceValue}</Text>
      <HmrProbeChild />
    </View>
  )
}
