import { KeepAwake as unavailable } from './unavailable'
import { assertKeepAwakeEnabled } from './validate'
let lock: WakeLockSentinel | undefined
let operation: Promise<void> = Promise.resolve()
export const KeepAwake = Object.freeze({
  isEnabled: async (): Promise<boolean> =>
    typeof window !== 'undefined' && !!lock && !lock.released,
  setEnabled: (enabled: boolean): Promise<void> => {
    assertKeepAwakeEnabled(enabled)
    if (typeof window === 'undefined') return unavailable.setEnabled(enabled)
    const next = operation
      .catch(() => {})
      .then(async () => {
        if (!enabled) {
          await lock?.release()
          lock = undefined
          return
        }
        if (lock && !lock.released) return
        if (!navigator.wakeLock)
          throw new Error('KeepAwake.setEnabled: Screen Wake Lock is unavailable')
        lock = await navigator.wakeLock.request('screen')
      })
    operation = next
    return next
  },
})
