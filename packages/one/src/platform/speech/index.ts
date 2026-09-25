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

// dictation needs the platform recognizer. permission reads answer denied,
// like every web entry's reads; starting a session has no web equivalent.
export const Speech = Object.freeze({
  isAvailable: (): boolean => false,
  getPermissions: (): Promise<SpeechPermissionResponse> => Promise.resolve(denied),
  requestPermissions: (): Promise<SpeechPermissionResponse> => Promise.resolve(denied),
  start: (_options: SpeechStartOptions, _onEvent: (event: SpeechEvent) => void): SpeechSession => {
    throw new Error('Speech.start needs an iOS or Android build')
  },
})
