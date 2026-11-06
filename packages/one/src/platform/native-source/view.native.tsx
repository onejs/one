import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import NativeKotlinHost from '../specs/OneKotlinHostNativeComponent'
import type { KotlinSourceViewProps } from './viewTypes'
import {
  decodeNativeSourceCallback,
} from './wire.native'
import { RESYNC_EVENT, useNativeSourceProps } from './wireProps.native'

export type { KotlinSourceViewProps } from './viewTypes'

export function KotlinSourceView({
  source,
  view,
  contractHash,
  props,
  wires,
}: KotlinSourceViewProps) {
  const keyed = useNativeSourceProps(props, wires, view !== '')
  const [contentSize, setContentSize] = useState<{ width: number; height: number }>()
  return (
    <View style={props.style} collapsable={false}>
      {/* yoga uses the natural child size while retaining parent flex and stretch. */}
      <View pointerEvents="none" style={contentSize} />
      <NativeKotlinHost
        source={source}
        view={view}
        contractHash={contractHash}
        props={keyed.text}
        onHostEvent={(event) => {
          if (event.nativeEvent.name === RESYNC_EVENT) return keyed.resync()
          const callback = props[event.nativeEvent.name]
          if (typeof callback === 'function') {
            const args = JSON.parse(event.nativeEvent.args) as unknown[]
            const argWires = wires?.callbacks[event.nativeEvent.name]
            callback(
              ...(argWires
                ? decodeNativeSourceCallback(args, argWires, wires?.structs ?? {}, event.nativeEvent.name)
                : args)
            )
          }
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
