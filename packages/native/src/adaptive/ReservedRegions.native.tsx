import { useCallback, useState } from 'react'
import type { NativeSyntheticEvent } from 'react-native'
import NativeReservedRegionsProvider from '../specs/OneNativeReservedRegionsProviderNativeComponent'
import { ReservedRegionsContext, type ReservedRegionsSnapshot } from './reservedRegionsContext'
import type { ReservedRegion, ReservedRegionsProviderProps } from './types'

export { useReady, useRegions } from './reservedRegionsContext'

type NativeRegion = {
  id: string
  kind: string
  x: number
  y: number
  width: number
  height: number
  marginTop: number
  marginLeft: number
  marginBottom: number
  marginRight: number
  isActive: boolean
}

function toRegion(region: NativeRegion): ReservedRegion {
  if (region.kind !== 'division' && region.kind !== 'occlusion') {
    throw new Error(`OneNativeReservedRegionsProvider emitted unknown kind ${region.kind}`)
  }
  return {
    id: region.id,
    kind: region.kind,
    frame: { x: region.x, y: region.y, width: region.width, height: region.height },
    margins: {
      top: region.marginTop,
      left: region.marginLeft,
      bottom: region.marginBottom,
      right: region.marginRight,
    },
    isActive: region.isActive,
  }
}

/**
 * A view that reports the regions reserved inside its own bounds (iOS 27.1
 * UIView reservedRegions, Android folding features and display cutouts) to
 * the hooks below it.
 */
export function Provider({ children, ...props }: ReservedRegionsProviderProps) {
  const [snapshot, setSnapshot] = useState<ReservedRegionsSnapshot>({ regions: [], ready: false })
  const onChange = useCallback(
    (event: NativeSyntheticEvent<{ regions: readonly NativeRegion[] }>) => {
      setSnapshot({ regions: event.nativeEvent.regions.map(toRegion), ready: true })
    },
    []
  )
  return (
    <ReservedRegionsContext.Provider value={snapshot}>
      <NativeReservedRegionsProvider {...props} onNativeReservedRegionsChange={onChange}>
        {children}
      </NativeReservedRegionsProvider>
    </ReservedRegionsContext.Provider>
  )
}
