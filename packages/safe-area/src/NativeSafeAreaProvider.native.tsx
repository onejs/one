import * as React from 'react'
import {
  NativeSafeAreaProvider as NativeSafeAreaProviderHost,
  providerEventToMetrics,
} from '@vxrn/native/safe-area'
import type { InsetChangedEvent, NativeSafeAreaProviderProps } from './SafeArea-types'

// native provider: the OneNativeSafeAreaProvider host measures insets on the
// UI thread and the adapter reshapes its flat event into context Metrics.
// a bare passthrough like upstream, with no forced style: the reported
// insets are relative to this view, exactly as with RNCSafeAreaProvider.
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
    <NativeSafeAreaProviderHost style={style} onNativeInsetsChange={handleInsetsChange}>
      {children}
    </NativeSafeAreaProviderHost>
  )
}
