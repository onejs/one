import { useEffect } from 'react'
import { assertPreventKey, preventDefaultKey, validateViewTag } from './validate'
import { validateCallback } from '../validateCallback'
import { NitroModules } from 'react-native-nitro-modules'
import { rethrowNativeError } from '../nativeError'
import type {
  OneScreenCapture,
  ScreenCaptureResult,
  ScreenCaptureState,
} from '../specs/OneScreenCapture.nitro'

export type {
  ScreenCaptureResult,
  ScreenCaptureState,
} from '../specs/OneScreenCapture.nitro'

let hybrid: OneScreenCapture | undefined

function native(): OneScreenCapture {
  hybrid ??= NitroModules.createHybridObject<OneScreenCapture>('OneScreenCapture')
  return hybrid
}

function getState(): Promise<ScreenCaptureState> {
  return native().getState().catch(rethrowNativeError)
}

function captureWindow(): Promise<ScreenCaptureResult> {
  return native().captureWindow().catch(rethrowNativeError)
}

function captureView(viewTag: number): Promise<ScreenCaptureResult> {
  validateViewTag(viewTag)
  return native().captureView(viewTag).catch(rethrowNativeError)
}

function addStateListener(onChange: (state: ScreenCaptureState) => void): () => void {
  validateCallback(onChange, 'ScreenCapture.addStateListener requires a function')
  return native().addStateListener(onChange)
}

function addScreenshotListener(onScreenshot: (timestampMs: number) => void): () => void {
  validateCallback(
    onScreenshot,
    'ScreenCapture.addScreenshotListener requires a function'
  )
  return native().addScreenshotListener(onScreenshot)
}

// keys held by prevent(), mirroring expo-screen-capture's activeTags: the
// native side arms once on the first key and releases on the last allow,
// so overlapping screens never conflict with each other.
const activeKeys = new Set<string>()
// native arm/release calls run one at a time in call order. `armed` is true
// once an arm lands and turns false as a release starts; `arming` is the
// queued or in-flight arm every prevent() shares until it settles, so no
// caller resolves before protection is on and a failed arm rejects them all.
let transitions: Promise<void> = Promise.resolve()
let armed = false
let arming: Promise<void> | undefined

function enqueue(transition: () => Promise<void>): Promise<void> {
  const next = transitions.then(transition)
  transitions = next.catch(() => {})
  return next
}

function prevent(key: string = preventDefaultKey): Promise<void> {
  assertPreventKey(key, 'prevent')
  activeKeys.add(key)
  if (armed) return Promise.resolve()
  arming ??= enqueue(async () => {
    try {
      // every waiter allowed before the queue reached this arm
      if (activeKeys.size === 0 || armed) return
      await native().prevent()
      armed = true
    } catch (error) {
      // no key is protected, so a retry must arm again
      activeKeys.clear()
      rethrowNativeError(error)
    } finally {
      arming = undefined
    }
  })
  return arming
}

function allow(key: string = preventDefaultKey): Promise<void> {
  assertPreventKey(key, 'allow')
  activeKeys.delete(key)
  if (activeKeys.size > 0) return Promise.resolve()
  return enqueue(async () => {
    if (activeKeys.size > 0) return
    const wasArmed = armed
    armed = false
    try {
      await native().allow()
    } catch (error) {
      armed = wasArmed
      rethrowNativeError(error)
    }
  })
}

function isPrevented(): Promise<boolean> {
  return native().isPrevented().catch(rethrowNativeError)
}

function usePreventScreenCapture(key: string = preventDefaultKey): void {
  assertPreventKey(key, 'prevent')
  useEffect(() => {
    prevent(key).catch((error: unknown) => {
      console.error(`Failed to prevent screen capture: ${String(error)}`)
    })
    return () => {
      allow(key).catch(() => {})
    }
  }, [key])
}

export const ScreenCapture = Object.freeze({
  getState,
  captureWindow,
  captureView,
  addStateListener,
  addScreenshotListener,
  prevent,
  allow,
  isPrevented,
})

export { usePreventScreenCapture }
