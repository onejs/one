import { useState } from 'react'
import { Text, View } from 'react-native'
import { HmrProbeChild } from '../features/hmr/HmrProbeChild'

declare global {
  var __ONE_HMR_ROUTE_GENERATION__: number | undefined
}

const routeGeneration = (globalThis.__ONE_HMR_ROUTE_GENERATION__ ?? 0) + 1
globalThis.__ONE_HMR_ROUTE_GENERATION__ = routeGeneration

export default function HmrProbe() {
  const [generation] = useState(routeGeneration)

  return (
    <View>
      <Text testID="route-hmr-version">route-v1</Text>
      <Text testID="route-hmr-generation">generation:{generation}</Text>
      <HmrProbeChild />
    </View>
  )
}
