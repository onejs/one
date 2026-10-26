import { createHash } from 'node:crypto'
import type { Entry } from './emit'

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, value]) => value !== undefined)
        .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
        .map(([key, value]) => [key, canonical(value)])
    )
  }
  return value
}

// a call's wire signature, rather than its position among supported symbols,
// identifies it across SDKs. added enum cases or key-path choices do not alter
// the argument representation. a changed representation gets a different id.
export function assignEntryIds(entries: Omit<Entry, 'swift'>[]): void {
  const seen = new Map<number, string>()
  for (const entry of entries) {
    const signature = JSON.stringify(canonical({
      key: entry.key,
      kind: entry.kind,
      main: entry.main,
      isAsync: entry.isAsync,
      syncCallbacks: entry.syncCallbacks === true,
      receiver: entry.receiver,
      specialization: entry.specialization,
      params: entry.params.map(({ keyPaths, typeNames, ...parameter }) => ({
        ...parameter,
        keyPaths: keyPaths !== undefined,
        typeNames: typeNames !== undefined,
      })),
      returns: entry.returns,
    }))
    // 52 bits are exact through javascript numbers, Nitro doubles and Swift Int.
    const id = Number.parseInt(createHash('sha256').update(signature).digest('hex').slice(0, 13), 16)
    if (seen.has(id)) {
      throw new Error(`duplicate iOS SDK dispatch identity: ${seen.get(id)} and ${entry.key}`)
    }
    seen.set(id, entry.key)
    entry.id = id
  }
}
