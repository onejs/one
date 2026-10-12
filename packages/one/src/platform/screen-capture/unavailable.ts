import { useEffect } from 'react'
import { assertPreventKey, preventDefaultKey, validateViewTag } from './validate'
import { validateCallback } from '../validateCallback'
import { missingNativeBuild } from '../nativeError'
import type {
  ScreenCaptureResult,
  ScreenCaptureState,
} from '../specs/OneScreenCapture.nitro'

export type {
  ScreenCaptureResult,
  ScreenCaptureState,
} from '../specs/OneScreenCapture.nitro'

export const ScreenCapture = Object.freeze({
  getState: (): Promise<ScreenCaptureState> => Promise.resolve('unspecified'),
  captureWindow: (): Promise<ScreenCaptureResult> =>
    Promise.reject(missingNativeBuild('ScreenCapture.captureWindow')),
  captureView: (viewTag: number): Promise<ScreenCaptureResult> => {
    validateViewTag(viewTag)
    return Promise.reject(missingNativeBuild('ScreenCapture.captureView'))
  },
  addStateListener: (onChange: (state: ScreenCaptureState) => void): (() => void) => {
    validateCallback(onChange, 'ScreenCapture.addStateListener requires a function')
    return () => {}
  },
  addScreenshotListener: (onScreenshot: (timestampMs: number) => void): (() => void) => {
    validateCallback(
      onScreenshot,
      'ScreenCapture.addScreenshotListener requires a function'
    )
    return () => {}
  },
  prevent: (key: string = preventDefaultKey): Promise<void> => {
    assertPreventKey(key, 'prevent')
    return Promise.resolve()
  },
  allow: (key: string = preventDefaultKey): Promise<void> => {
    assertPreventKey(key, 'allow')
    return Promise.resolve()
  },
  isPrevented: (): Promise<boolean> => Promise.resolve(false),
})

export function usePreventScreenCapture(key: string = preventDefaultKey): void {
  assertPreventKey(key, 'prevent')
  useEffect(() => {}, [key])
}
