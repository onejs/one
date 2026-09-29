import { Platform } from 'react-native'
import { NitroModules } from 'react-native-nitro-modules'
import { rethrowNativeError } from '../nativeError'
import type { OneScreenCapture, ScreenCaptureState, WindowCaptureResult } from '../specs/OneScreenCapture.nitro'

export type { ScreenCaptureState, WindowCaptureResult } from '../specs/OneScreenCapture.nitro'

let hybrid: OneScreenCapture | undefined

function native(): OneScreenCapture {
  if (Platform.OS !== 'ios') throw new Error('ScreenCapture requires an iOS native build')
  hybrid ??= NitroModules.createHybridObject<OneScreenCapture>('OneScreenCapture')
  return hybrid
}

function getState(): Promise<ScreenCaptureState> {
  return native().getState().catch(rethrowNativeError)
}

function captureWindow(): Promise<WindowCaptureResult> {
  return native().captureWindow().catch(rethrowNativeError)
}

function addStateListener(onChange: (state: ScreenCaptureState) => void): () => void {
  if (typeof onChange !== 'function') throw new TypeError('ScreenCapture.addStateListener requires a function')
  return native().addStateListener(onChange)
}

function addScreenshotListener(onScreenshot: (timestampMs: number) => void): () => void {
  if (typeof onScreenshot !== 'function') throw new TypeError('ScreenCapture.addScreenshotListener requires a function')
  return native().addScreenshotListener(onScreenshot)
}

export const ScreenCapture = Object.freeze({ getState, captureWindow, addStateListener, addScreenshotListener })
