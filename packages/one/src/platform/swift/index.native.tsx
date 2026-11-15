// the component a device build answers a `.swift` import with: the swift
// package compiled into the app, rendered by its registered view or by one of
// its typed views.
import { StyleSheet } from 'react-native'
import NativeSwiftHost from '../specs/OneSwiftHostNativeComponent'
import {
  decodeNativeSourceCallback,
} from '../native-source/wire.native'
import { RESYNC_EVENT, useNativeSourceProps } from '../native-source/wireProps.native'
import type { SwiftPackageViewProps } from './types'

export type { SwiftPackageViewProps } from './types'

export function SwiftPackageView({
  packageName,
  view,
  contractHash,
  props,
  fill,
  wires,
}: SwiftPackageViewProps) {
  const keyed = useNativeSourceProps(props, wires, view !== '')
  const style = StyleSheet.flatten(props.style)
  const fills = fill || (style?.flex ?? 0) > 0 || (style?.flexGrow ?? 0) > 0
  return (
    <NativeSwiftHost
      packageName={packageName}
      view={view}
      contractHash={contractHash}
      // a typed view's host learns which callbacks the element passed
      props={keyed.text}
      fill={fills}
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
      style={fill ? { flex: 1 } : style}
    />
  )
}
