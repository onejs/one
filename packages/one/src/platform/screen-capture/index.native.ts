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

function prevent(key: string = preventDefaultKey): Promise<void> {
  assertPreventKey(key, 'prevent')
  if (activeKeys.has(key)) return Promise.resolve()
  activeKeys.add(key)
  if (activeKeys.size > 1) return Promise.resolve()
  return native()
    .prevent()
    .catch((error: unknown) => {
      activeKeys.delete(key)
      throw rethrowNativeError(error)
    })
}

function allow(key: string = preventDefaultKey): Promise<void> {
  assertPreventKey(key, 'allow')
  activeKeys.delete(key)
  if (activeKeys.size > 0) return Promise.resolve()
  return native().allow().catch(rethrowNativeError)
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
