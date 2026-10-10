import { ScreenOrientation as unavailable } from './unavailable'
import { validateCallback } from '../validateCallback'
import type {
  ScreenOrientationLock,
  ScreenOrientationValue,
} from '../specs/OneScreenOrientation.nitro'
export type { ScreenOrientationLock, ScreenOrientationValue }
const values: Record<string, ScreenOrientationValue> = {
  'portrait-primary': 'portrait',
  'portrait-secondary': 'portraitUpsideDown',
  'landscape-primary': 'landscapeLeft',
  'landscape-secondary': 'landscapeRight',
}
const locks = {
  portrait: 'portrait-primary',
  portraitUpsideDown: 'portrait-secondary',
  landscapeLeft: 'landscape-primary',
  landscapeRight: 'landscape-secondary',
  landscape: 'landscape',
} as const
function orientation(): ScreenOrientationValue {
  return values[window.screen.orientation?.type] ?? 'unknown'
}
export const ScreenOrientation = Object.freeze({
  getOrientation: async (): Promise<ScreenOrientationValue> =>
    typeof window === 'undefined' ? 'unknown' : orientation(),
  lock: async (value: ScreenOrientationLock): Promise<ScreenOrientationValue> => {
    if (typeof window === 'undefined') return unavailable.lock(value)
    if (!locks[value]) throw new TypeError('ScreenOrientation.lock: invalid orientation')
    const screenOrientation = window.screen
      .orientation as globalThis.ScreenOrientation & {
      lock?: (value: string) => Promise<void>
    }
    if (!screenOrientation?.lock)
      throw new Error('ScreenOrientation.lock: orientation locking is unavailable')
    await screenOrientation.lock(locks[value])
    const result = orientation()
    if (value === 'landscape' ? !result.startsWith('landscape') : result !== value) {
      throw new Error(
        'ScreenOrientation.lock: screen did not reach the requested orientation'
      )
    }
    return result
  },
  unlock: async (): Promise<ScreenOrientationValue> => {
    if (typeof window === 'undefined') return unavailable.unlock()
    if (!window.screen.orientation?.unlock)
      throw new Error('ScreenOrientation.unlock: orientation locking is unavailable')
    window.screen.orientation.unlock()
    return orientation()
  },
  addChangeListener: (
    onChange: (value: ScreenOrientationValue) => void
  ): (() => void) => {
    validateCallback(onChange, 'ScreenOrientation.addChangeListener requires a function')
    if (typeof window === 'undefined' || !window.screen.orientation) return () => {}
    const target = window.screen.orientation
    const listener = () => onChange(orientation())
    target.addEventListener('change', listener)
    return () => target.removeEventListener('change', listener)
  },
})
