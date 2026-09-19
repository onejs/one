import * as React from 'react'
import { StyleSheet } from 'react-native'
import {
  NativeSafeAreaProvider as NativeSafeAreaProviderHost,
  providerEventToMetrics,
} from '@vxrn/native/safe-area'
import type { InsetChangedEvent, NativeSafeAreaProviderProps } from './SafeArea-types'

// native provider: the OneNativeSafeAreaProvider host measures insets on the
// UI thread and the adapter reshapes its flat event into context Metrics.
// fills like upstream so the measured view covers its parent; the reported
// insets stay relative to this view, exactly as with RNCSafeAreaProvider.
// the fill lives here rather than the shared context so web keeps its
// display:contents provider and sticky positioning keeps working there.
export function NativeSafeAreaProvider({
  children,
  style,
  onInsetsChange,
}: NativeSafeAreaProviderProps) {
  const handleInsetsChange = React.useCallback(
    ({ nativeEvent }: { nativeEvent: Parameters<typeof providerEventToMetrics>[0] }) => {
      onInsetsChange({
        nativeEvent: providerEventToMetrics(nativeEvent),
      } as InsetChangedEvent)
    },
    [onInsetsChange]
  )

  return (
    <NativeSafeAreaProviderHost
      style={[styles.fill, style]}
      onNativeInsetsChange={handleInsetsChange}
    >
      {children}
    </NativeSafeAreaProviderHost>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
})
