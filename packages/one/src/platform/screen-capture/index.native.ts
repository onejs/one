import { Platform } from 'react-native'
import { NitroModules } from 'react-native-nitro-modules'
import { rethrowNativeError } from '../nativeError'
import type { OneScreenCapture, ScreenCaptureResult, ScreenCaptureState } from '../specs/OneScreenCapture.nitro'

export type { ScreenCaptureResult, ScreenCaptureState } from '../specs/OneScreenCapture.nitro'

let hybrid: OneScreenCapture | undefined

function native(): OneScreenCapture {
  if (Platform.OS !== 'ios') throw new Error('ScreenCapture requires an iOS native build')
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
  if (!Number.isInteger(viewTag) || viewTag < 1 || viewTag > 2147483647)
    throw new TypeError('ScreenCapture.captureView requires a positive 32-bit integer view tag')
  return native().captureView(viewTag).catch(rethrowNativeError)
}

function addStateListener(onChange: (state: ScreenCaptureState) => void): () => void {
  if (typeof onChange !== 'function') throw new TypeError('ScreenCapture.addStateListener requires a function')
  return native().addStateListener(onChange)
}

function addScreenshotListener(onScreenshot: (timestampMs: number) => void): () => void {
  if (typeof onScreenshot !== 'function') throw new TypeError('ScreenCapture.addScreenshotListener requires a function')
  return native().addScreenshotListener(onScreenshot)
}

export const ScreenCapture = Object.freeze({ getState, captureWindow, captureView, addStateListener, addScreenshotListener })
