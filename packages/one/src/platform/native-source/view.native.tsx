// the component a device build answers `import { X } from './X.kt'` with: the
// composable compiled into the app, rendered by the kotlin host view.
import { useState } from 'react'
import { StyleSheet } from 'react-native'
import NativeKotlinHost from '../specs/OneKotlinHostNativeComponent'
import type { KotlinSourceViewProps } from './viewTypes'

export type { KotlinSourceViewProps } from './viewTypes'

export function KotlinSourceView({ source, view, contractHash, props }: KotlinSourceViewProps) {
  const [contentSize, setContentSize] = useState<{ width: number; height: number }>()
  const rootStyle = StyleSheet.flatten((props as any)?.style)

  const stretchedWidth =
    rootStyle?.width != null ||
    (typeof rootStyle?.flex === 'number' && rootStyle.flex > 0) ||
    (typeof rootStyle?.flexGrow === 'number' && rootStyle.flexGrow > 0) ||
    rootStyle?.alignSelf === 'stretch'

  const stretchedHeight =
    rootStyle?.height != null ||
    (typeof rootStyle?.flex === 'number' && rootStyle.flex > 0) ||
    (typeof rootStyle?.flexGrow === 'number' && rootStyle.flexGrow > 0) ||
    rootStyle?.alignSelf === 'stretch'

  return (
    <NativeKotlinHost
      source={source}
      view={view}
      contractHash={contractHash}
      // a callback travels as true; the composable's lambda reports its call
      props={JSON.stringify(props, (_key, value) => (typeof value === 'function' ? true : value))}
      onHostEvent={(event) => {
        const callback = props[event.nativeEvent.name]
        if (typeof callback === 'function') callback(...JSON.parse(event.nativeEvent.args))
      }}
      onHostSizeChange={(event) => {
        setContentSize(event.nativeEvent)
      }}
      style={[
        contentSize && {
          width: stretchedWidth ? undefined : contentSize.width,
          height: stretchedHeight ? undefined : contentSize.height,
        },
        (props as any)?.style,
      ]}
    />
  )
}
