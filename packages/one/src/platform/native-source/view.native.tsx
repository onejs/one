import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import NativeKotlinHost from '../specs/OneKotlinHostNativeComponent'
import type { KotlinSourceViewProps } from './viewTypes'

export type { KotlinSourceViewProps } from './viewTypes'

export function KotlinSourceView({
  source,
  view,
  contractHash,
  props,
}: KotlinSourceViewProps) {
  const [contentSize, setContentSize] = useState<{ width: number; height: number }>()
  return (
    <View style={props.style} collapsable={false}>
      {/* yoga uses the natural child size while retaining parent flex and stretch. */}
      <View pointerEvents="none" style={contentSize} />
      <NativeKotlinHost
        source={source}
        view={view}
        contractHash={contractHash}
        props={JSON.stringify(props, (_key, value) =>
          typeof value === 'function' ? true : value
        )}
        onHostEvent={(event) => {
          const callback = props[event.nativeEvent.name]
          if (typeof callback === 'function')
            callback(...JSON.parse(event.nativeEvent.args))
        }}
        onHostSizeChange={(event) => {
          setContentSize({
            width: event.nativeEvent.width,
            height: event.nativeEvent.height,
          })
        }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  )
}
