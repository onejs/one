// a `.swift` import is compiled as one project wasm artifact and mounted as a
// React component in the native preview. RNXPackage views receive data props;
// children are never part of the Swift mount contract.
//
// a file declaring `RNXModule` classes also exports them by name. their types
// are the `<name>.d.swift.ts` beside it that `one typegen` writes and the
// read ahead of this module.
declare module '*.swift' {
  import type { ComponentType } from 'react'
  const SwiftEntry: ComponentType<Record<string, unknown> & { children?: never }>
  export default SwiftEntry
}
