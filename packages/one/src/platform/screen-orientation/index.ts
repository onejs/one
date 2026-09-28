import type {
  ScreenOrientationLock,
  ScreenOrientationValue,
} from '../specs/OneScreenOrientation.nitro'

export type { ScreenOrientationLock, ScreenOrientationValue } from '../specs/OneScreenOrientation.nitro'

const unsupported = (): never => {
  throw new Error('ScreenOrientation requires an iOS native build')
}

export const ScreenOrientation = Object.freeze({
  getOrientation: (): Promise<ScreenOrientationValue> => unsupported(),
  lock: (_orientation: ScreenOrientationLock): Promise<ScreenOrientationValue> => unsupported(),
  unlock: (): Promise<ScreenOrientationValue> => unsupported(),
  addChangeListener: (_onChange: (orientation: ScreenOrientationValue) => void): (() => void) => unsupported(),
})
