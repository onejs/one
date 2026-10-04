import { validateViewTag } from './validate'
import { validateCallback } from '../validateCallback'
import { Platform } from 'react-native'
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

export const ScreenCapture = Object.freeze({
  getState,
  captureWindow,
  captureView,
  addStateListener,
  addScreenshotListener,
})
