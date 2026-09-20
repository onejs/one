import { useCallback, useMemo, useRef, useState } from 'react'

// observable state shared between JavaScript and SwiftUI views, in the shape of
// Expo's useNativeState: one handle feeds any number of controlled props, so every
// bound view converges on the same value. each view keeps its own acknowledgement
// stream (useControlled per view), which stays coherent under sharing because an
// acknowledgement only ever advances its own view's event count.
//
// what this is not: writes still travel through the React render cycle. synchronous
// UI-thread updates need a shared worklets runtime, which this package does not
// have; the handle identity is the seam a future one would hang onto. and the
// handle does not pass as a prop itself yet (`text={name}`): the generated
// adapters take plain values, so spread the pair (`text={name.value}
// onTextChange={name.set}`) until the emitter learns the object shape.
export type NativeState<T> = {
  readonly value: T
  set(value: T | ((previous: T) => T)): void
  get(): T
}

export function useNativeState<T>(initial: T): NativeState<T> {
  const [, setValue] = useState(initial)
  const ref = useRef(initial)
  const set = useCallback(
    (next: T | ((previous: T) => T)) => {
      const resolved =
        typeof next === 'function'
          ? (next as (previous: T) => T)(ref.current)
          : next
      ref.current = resolved
      setValue(resolved)
    },
    []
  )
  const get = useCallback(() => ref.current, [])
  // stable identity: the value reads live through the ref, so a bound view never
  // re-renders over the handle itself, only over the value it spreads.
  return useMemo(
    () => ({
      get value() {
        return ref.current
      },
      set,
      get,
    }),
    [set, get]
  )
}
