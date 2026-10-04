import type {
  ScreenOrientationLock,
  ScreenOrientationValue,
} from '../specs/OneScreenOrientation.nitro'

export type { ScreenOrientationLock, ScreenOrientationValue } from '../specs/OneScreenOrientation.nitro'

export const ScreenOrientation = Object.freeze({
  getOrientation: (): Promise<ScreenOrientationValue> => Promise.resolve('unknown'),
  lock: (_orientation: ScreenOrientationLock): Promise<ScreenOrientationValue> => Promise.resolve('unknown'),
  unlock: (): Promise<ScreenOrientationValue> => Promise.resolve('unknown'),
  addChangeListener: (_onChange: (orientation: ScreenOrientationValue) => void): (() => void) => () => {},
})
