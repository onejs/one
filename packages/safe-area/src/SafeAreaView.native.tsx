import * as React from 'react'
import { StyleSheet, View } from 'react-native'
import { buildSafeAreaInsetStyle } from '@vxrn/native/safe-area'
import { initialWindowMetrics } from './InitialWindow'
import { SafeAreaInsetsContext } from './SafeAreaContext'
import type {
  NativeSafeAreaViewInstance,
  NativeSafeAreaViewProps,
} from './SafeArea-types'

const ZERO_INSETS = { top: 0, right: 0, bottom: 0, left: 0 }

// native view: applies the nearest provider's insets as padding or margin
// per the edge modes. without a provider it falls back to the synchronous
// native initial metrics, so a standalone view still matches upstream
// instead of throwing like the hook.
export const SafeAreaView = React.forwardRef<
  NativeSafeAreaViewInstance,
  NativeSafeAreaViewProps
>(({ style, mode, edges, ...rest }, ref) => {
  const contextInsets = React.useContext(SafeAreaInsetsContext)
  const insets = contextInsets ?? initialWindowMetrics?.insets ?? ZERO_INSETS

  const appliedStyle = React.useMemo(
    () => ({
      ...StyleSheet.flatten(style),
      ...buildSafeAreaInsetStyle({
        insets,
        edges,
        mode,
        style,
        resolveStyle: StyleSheet.flatten,
      }),
    }),
    [style, insets, edges, mode]
  )

  return <View {...rest} style={appliedStyle} ref={ref} />
})
