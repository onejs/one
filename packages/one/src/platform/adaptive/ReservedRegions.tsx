import { useCallback, useState } from 'react'
import { View, type LayoutChangeEvent } from 'react-native'
import { ReservedRegionsContext, type ReservedRegionsSnapshot } from './reservedRegionsContext'
import type { ReservedRegionsProviderProps } from './types'

export { useReady, useRegions, useSegments, useSpanning } from './reservedRegionsContext'

// the web has no reserved-region source this view can read, so the provider
// is ready at once with none.
export function Provider({ children, onLayout, ...props }: ReservedRegionsProviderProps) {
  const [snapshot, setSnapshot] = useState<ReservedRegionsSnapshot>({ regions: [], ready: true, bounds: null })
  const onProviderLayout = useCallback((event: LayoutChangeEvent) => {
    onLayout?.(event)
    const { width, height } = event.nativeEvent.layout
    setSnapshot((current) =>
      current.bounds?.width === width && current.bounds.height === height
        ? current
        : { ...current, bounds: { width, height } }
    )
  }, [onLayout])
  return (
    <ReservedRegionsContext.Provider value={snapshot}>
      <View {...props} onLayout={onProviderLayout}>{children}</View>
    </ReservedRegionsContext.Provider>
  )
}
