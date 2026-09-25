import { View } from 'react-native'
import { ReservedRegionsContext, type ReservedRegionsSnapshot } from './reservedRegionsContext'
import type { ReservedRegionsProviderProps } from './types'

export { useReady, useRegions } from './reservedRegionsContext'

// the web has no reserved-region source this view can read, so the provider
// is ready at once with none.
const webSnapshot: ReservedRegionsSnapshot = { regions: [], ready: true }

export function Provider({ children, ...props }: ReservedRegionsProviderProps) {
  return (
    <ReservedRegionsContext.Provider value={webSnapshot}>
      <View {...props}>{children}</View>
    </ReservedRegionsContext.Provider>
  )
}
