// the component a device build answers `import { X } from './X.kt'` with: the
// composable compiled into the app, rendered by the kotlin host view.
import NativeKotlinHost from '../specs/OneKotlinHostNativeComponent'
import type { KotlinSourceViewProps } from './viewTypes'

export type { KotlinSourceViewProps } from './viewTypes'

export function KotlinSourceView({ source, view, contractHash, props }: KotlinSourceViewProps) {
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
    />
  )
}
