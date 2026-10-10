import {
  assertOpen,
  requireKey,
  requireName,
  requireValue,
  type DatabaseKeyValue,
} from './keyValueValidate'

// named string stores on web. each name is its own localStorage namespace, so
// a second open of the same name sees the previous values. sqlite open stays
// native-only; this is the key-value api that replaces a named mmkv instance.

export type { DatabaseKeyValue }

function storagePrefix(name: string): string {
  // the trailing separator is not a legal name character, so one name cannot
  // swallow the keys of a longer name.
  return `One.Database.kv|${name}|`
}

export function openKeyValue(options: { name: string }): DatabaseKeyValue {
  const name = requireName(options?.name)
  if (typeof localStorage === 'undefined') {
    throw new Error('Database.openKeyValue requires localStorage in this runtime')
  }
  const prefix = storagePrefix(name)
  let closed = false

  function matchingKeys(): string[] {
    const keys: string[] = []
    for (let index = 0; index < localStorage.length; index++) {
      const stored = localStorage.key(index)
      if (stored?.startsWith(prefix)) keys.push(stored)
    }
    return keys
  }

  return Object.freeze({
    getItem(key: string): string | null {
      assertOpen('Database.getItem', closed)
      requireKey('Database.getItem', key)
      return localStorage.getItem(prefix + key)
    },
    setItem(key: string, value: string): void {
      assertOpen('Database.setItem', closed)
      requireKey('Database.setItem', key)
      requireValue('Database.setItem', value)
      localStorage.setItem(prefix + key, value)
    },
    removeItem(key: string): void {
      assertOpen('Database.removeItem', closed)
      requireKey('Database.removeItem', key)
      localStorage.removeItem(prefix + key)
    },
    getAllKeys(): string[] {
      assertOpen('Database.getAllKeys', closed)
      return matchingKeys()
        .map((stored) => stored.slice(prefix.length))
        .sort()
    },
    clear(): void {
      assertOpen('Database.clear', closed)
      for (const stored of matchingKeys()) localStorage.removeItem(stored)
    },
    close(): void {
      closed = true
    },
  })
}
