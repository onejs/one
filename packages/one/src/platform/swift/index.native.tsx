// the component a device build answers `import X from './X.swift'` with: the
// swift package compiled into the app, rendered by its registered view.
import NativeSwiftHost from '../specs/OneSwiftHostNativeComponent'
import type { SwiftPackageViewProps } from './types'

export type { SwiftPackageViewProps } from './types'

export function SwiftPackageView({ packageName, props, fill }: SwiftPackageViewProps) {
  return (
    <NativeSwiftHost
      packageName={packageName}
      props={JSON.stringify(props)}
      fill={fill}
      style={fill ? { flex: 1 } : undefined}
    />
  )
}
