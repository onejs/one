// node test double for react-native-worklets: the real module needs the Metro
// runtime, so vitest aliases it here (see vitest.config.ts). behavior matches
// the documented contract: one shared cell, synchronous blocking access.
export function createSynchronizable<TValue = unknown>(initial: TValue) {
  let current = initial
  return {
    __synchronizableRef: true as const,
    getDirty: () => current,
    getBlocking: () => current,
    setBlocking: (next: TValue | ((previous: TValue) => TValue)) => {
      current =
        typeof next === 'function'
          ? (next as (previous: TValue) => TValue)(current)
          : next
    },
    lock: () => {},
    unlock: () => {},
  }
}
