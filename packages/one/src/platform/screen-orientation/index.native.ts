import { validateCallback } from '../validateCallback'
import { NitroModules } from 'react-native-nitro-modules'
import { rethrowNativeError } from '../nativeError'
import type {
  OneScreenOrientation,
  ScreenOrientationLock,
  ScreenOrientationValue,
} from '../specs/OneScreenOrientation.nitro'

export type {
  ScreenOrientationLock,
  ScreenOrientationValue,
} from '../specs/OneScreenOrientation.nitro'

let hybrid: OneScreenOrientation | undefined

function native(): OneScreenOrientation {
  if (Platform.OS !== 'ios')
    throw new Error('ScreenOrientation requires an iOS native build')
  hybrid ??= NitroModules.createHybridObject<OneScreenOrientation>('OneScreenOrientation')
  return hybrid
}

function getOrientation(): Promise<ScreenOrientationValue> {
  return native().getOrientation().catch(rethrowNativeError)
}

function lock(orientation: ScreenOrientationLock): Promise<ScreenOrientationValue> {
  return native().lock(orientation).catch(rethrowNativeError)
}

function unlock(): Promise<ScreenOrientationValue> {
  return native().unlock().catch(rethrowNativeError)
}

function addChangeListener(
  onChange: (orientation: ScreenOrientationValue) => void
): () => void {
  validateCallback(onChange, 'ScreenOrientation.addChangeListener requires a function')
  return native().addChangeListener(onChange)
}

export const ScreenOrientation = Object.freeze({
  getOrientation,
  lock,
  unlock,
  addChangeListener,
})
