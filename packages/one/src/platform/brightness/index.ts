import type {
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

// web entry. same signatures as the native entry: the published
// declarations are built from this file and serve both platforms. browsers
// expose no brightness api, so reads resolve the assume-full value, effects
// resolve without doing anything, and listeners never fire.
async function get(): Promise<number> {
  return 1
}

function set(value: number): Promise<void> {
  assertBrightnessValue(value, 'Brightness.set')
  return Promise.resolve()
}

async function getSystem(): Promise<number> {
  return 1
}

function setSystem(value: number): Promise<void> {
  assertBrightnessValue(value, 'Brightness.setSystem')
  return Promise.resolve()
}

async function getSystemMode(): Promise<BrightnessMode> {
  return 'unknown'
}

function setSystemMode(mode: BrightnessMode): Promise<void> {
  assertSystemMode(mode)
  return Promise.resolve()
}

async function isUsingSystem(): Promise<boolean> {
  return true
}

async function restoreSystem(): Promise<void> {}

async function denied(): Promise<BrightnessPermissionResponse> {
  return { status: 'denied', granted: false, canAskAgain: false }
}

function getPermissions(): Promise<BrightnessPermissionResponse> {
  return denied()
}

function requestPermissions(): Promise<BrightnessPermissionResponse> {
  return denied()
}

function isAvailable(): boolean {
  return false
}

function addListener(
  listener: (event: { brightness: number }) => void
): BrightnessSubscription {
  assertBrightnessListener(listener)
  return { remove: () => {} }
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
