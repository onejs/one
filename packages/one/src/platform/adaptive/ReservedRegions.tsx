import { useCallback, useState } from 'react'
import type { LayoutChangeEvent } from 'react-native'
import { DomView } from '../web/DomView'
import { ReservedRegionsContext, type ReservedRegionsSnapshot } from './reservedRegionsContext'
import type { ReservedRegionsProviderProps } from './types'

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
      <DomView {...props} onLayout={onProviderLayout}>{children}</DomView>
    </ReservedRegionsContext.Provider>
  )
}
