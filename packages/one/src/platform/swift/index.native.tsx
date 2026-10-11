// the component a device build answers a `.swift` import with: the swift
// package compiled into the app, rendered by its registered view or by one of
// its typed views.
import NativeSwiftHost from '../specs/OneSwiftHostNativeComponent'
import {
  decodeNativeSourceCallback,
  encodeNativeSourceProps,
} from '../native-source/wire.native'
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
  const encoded = wires ? encodeNativeSourceProps(props, wires.props, wires.structs) : props
  return (
    <NativeSwiftHost
      packageName={packageName}
      view={view}
      contractHash={contractHash}
      // a typed view's host learns which callbacks the element passed
      props={JSON.stringify(encoded, (_key, value) =>
        typeof value === 'function' ? true : value
      )}
      fill={fill}
      onHostEvent={(event) => {
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
      style={fill ? { flex: 1 } : undefined}
    />
  )
}
