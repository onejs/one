import { NitroModules } from 'react-native-nitro-modules'
import { rethrowNativeError } from '../nativeError'
import type { OneBrightness } from '../specs/OneBrightness.nitro'
import type {
  BrightnessEvent,
  BrightnessMode,
  BrightnessPermissionResponse,
  BrightnessSubscription,
} from './types'
import {
  assertBrightnessListener,
  assertBrightnessValue,
  assertSystemMode,
} from './validate'

export type {
  BrightnessEvent,
  BrightnessMode,
  BrightnessPermissionResponse,
  BrightnessPermissionStatus,
  BrightnessSubscription,
} from './types'

// screen brightness matching expo-brightness, backed by the OneBrightness
// nitro hybrid object (created on first use and cached). the first listener
// starts the native observer, so the first event can never race the
// subscription.
let hybrid: OneBrightness | undefined

function native(): OneBrightness {
  hybrid ??= NitroModules.createHybridObject<OneBrightness>('OneBrightness')
  return hybrid
}

function get(): Promise<number> {
  return native().get().catch(rethrowNativeError)
}

function set(value: number): Promise<void> {
  assertBrightnessValue(value, 'Brightness.set')
  return native().set(value).catch(rethrowNativeError)
}

function getSystem(): Promise<number> {
  return native().getSystem().catch(rethrowNativeError)
}

function setSystem(value: number): Promise<void> {
  assertBrightnessValue(value, 'Brightness.setSystem')
  return native().setSystem(value).catch(rethrowNativeError)
}

function getSystemMode(): Promise<BrightnessMode> {
  return native().getSystemMode().catch(rethrowNativeError)
}

function setSystemMode(mode: BrightnessMode): Promise<void> {
  assertSystemMode(mode)
  return native().setSystemMode(mode).catch(rethrowNativeError)
}

function isUsingSystem(): Promise<boolean> {
  return native().isUsingSystem().catch(rethrowNativeError)
}

function restoreSystem(): Promise<void> {
  return native().restoreSystem().catch(rethrowNativeError)
}

function getPermissions(): Promise<BrightnessPermissionResponse> {
  return native().getPermissions().catch(rethrowNativeError)
}

function requestPermissions(): Promise<BrightnessPermissionResponse> {
  return native().requestPermissions().catch(rethrowNativeError)
}

function isAvailable(): boolean {
  return native().isAvailable()
}

function addListener(listener: (event: BrightnessEvent) => void): BrightnessSubscription {
  assertBrightnessListener(listener)
  const remove = native().addListener(listener)
  return { remove: () => remove() }
}

export const Brightness = Object.freeze({
  get,
  set,
  getSystem,
  setSystem,
  getSystemMode,
  setSystemMode,
  isUsingSystem,
  restoreSystem,
  getPermissions,
  requestPermissions,
  isAvailable,
  addListener,
})
