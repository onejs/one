// the component a device build answers a `.swift` import with: the swift
// package compiled into the app, rendered by its registered view or by one of
// its typed views.
import NativeSwiftHost from '../specs/OneSwiftHostNativeComponent'
import type { SwiftPackageViewProps } from './types'

export type { SwiftPackageViewProps } from './types'

export function SwiftPackageView({
  packageName,
  view,
  contractHash,
  props,
  fill,
}: SwiftPackageViewProps) {
  return (
    <NativeSwiftHost
      packageName={packageName}
      view={view}
      contractHash={contractHash}
      // a typed view's host learns which callbacks the element passed
      props={JSON.stringify(props, (_key, value) =>
        typeof value === 'function' ? true : value
      )}
      fill={fill}
      onHostEvent={(event) => {
        const callback = props[event.nativeEvent.name]
        if (typeof callback === 'function')
          callback(...JSON.parse(event.nativeEvent.args))
      }}
      style={fill ? { flex: 1 } : undefined}
    />
  )
}
