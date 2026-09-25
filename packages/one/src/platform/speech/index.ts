import type {
  SpeechEvent,
  SpeechPermissionResponse,
  SpeechSession,
  SpeechStartOptions,
} from './types'

export type * from './types'

const denied: SpeechPermissionResponse = {
  status: 'denied',
  granted: false,
  canAskAgain: false,
}

// dictation needs the platform recognizer, so on web a session fails the
// way it does on a device whose recognition service is unavailable.
export const Speech = Object.freeze({
  isAvailable: (): boolean => false,
  getPermissions: (): Promise<SpeechPermissionResponse> => Promise.resolve(denied),
  requestPermissions: (): Promise<SpeechPermissionResponse> => Promise.resolve(denied),
  start: (
    _options: SpeechStartOptions,
    onEvent: (event: SpeechEvent) => void
  ): SpeechSession => {
    if (typeof onEvent !== 'function') {
      throw new TypeError('Speech.start: onEvent must be a function')
    }
    queueMicrotask(() =>
      onEvent({
        type: 'error',
        transcript: '',
        error: 'service-not-allowed',
        message: 'Speech.start needs an iOS or Android build',
      })
    )
    return { stop: () => {}, abort: () => {} }
  },
})
