import { useEffect, useId } from 'react'
import { KeepAwake as unavailable } from './unavailable'
import {
  assertKeepAwakeEnabled,
  assertKeepAwakeTag,
  normalizeKeepAwakeTag,
} from './validate'

const active = new Set<string>()
let lock: WakeLockSentinel | undefined
let operation: Promise<void> = Promise.resolve()

function live(): boolean {
  return !!lock && !lock.released
}

function apply(owner: 'setEnabled' | 'activate' | 'deactivate'): Promise<void> {
  const next = operation
    .catch(() => {})
    .then(async () => {
      if (active.size === 0) {
        await lock?.release()
        lock = undefined
        return
      }
      if (live()) return
      if (!navigator.wakeLock)
        throw new Error(`KeepAwake.${owner}: Screen Wake Lock is unavailable`)
      lock = await navigator.wakeLock.request('screen')
    })
  operation = next
  return next
}

export const KeepAwake = Object.freeze({
  isEnabled: async (): Promise<boolean> =>
    typeof window !== 'undefined' && active.size > 0 && live(),
  setEnabled: (enabled: boolean): Promise<void> => {
    assertKeepAwakeEnabled(enabled)
    if (typeof window === 'undefined') return unavailable.setEnabled(enabled)
    if (enabled) active.add(normalizeKeepAwakeTag(undefined))
    else active.delete(normalizeKeepAwakeTag(undefined))
    return apply('setEnabled')
  },
  activate: (tag?: string): Promise<void> => {
    assertKeepAwakeTag(tag, 'activate')
    if (typeof window === 'undefined') return unavailable.activate(tag)
    active.add(normalizeKeepAwakeTag(tag))
    return apply('activate')
  },
  deactivate: (tag?: string): Promise<void> => {
    assertKeepAwakeTag(tag, 'deactivate')
    if (typeof window === 'undefined') return unavailable.deactivate(tag)
    active.delete(normalizeKeepAwakeTag(tag))
    return apply('deactivate')
  },
})

export function useKeepAwake(tag?: string): void {
  const fallback = useId()
  assertKeepAwakeTag(tag, 'useKeepAwake')
  // a hook without a tag owns an id unique to its component instance, never
  // the shared default tag, matching expo-keep-awake.
  const effective = tag ?? fallback
  useEffect(() => {
    if (typeof window === 'undefined') return
    void KeepAwake.activate(effective)
    return () => {
      void KeepAwake.deactivate(effective)
    }
  }, [effective])
}
