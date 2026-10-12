// dictation through the platform recognizer. a session streams the whole
// transcript so far, never a fragment, and ends with exactly one `end`
// (stop, trailing silence, or no speech at all) or `error` event. abort ends
// it silently. error codes and the permission response keep
// expo-speech-recognition's values.
export type SpeechPermissionStatus = 'granted' | 'denied' | 'undetermined'

export interface SpeechPermissionResponse {
  status: SpeechPermissionStatus
  granted: boolean
  canAskAgain: boolean
  // ios: screen time or device management blocks speech recognition
  restricted?: boolean
}

export type SpeechEventType = 'start' | 'transcript' | 'end' | 'error'

export type SpeechErrorCode =
  | 'not-allowed'
  | 'service-not-allowed'
  | 'language-not-supported'
  | 'audio-capture'
  | 'interrupted'
  | 'network'
  | 'busy'
  | 'unknown'

export interface SpeechEvent {
  type: SpeechEventType
  // the full transcript so far; on `end` and `error`, everything heard
  transcript: string
  error?: SpeechErrorCode
  message?: string
}

export interface SpeechStartOptions {
  // a BCP-47 tag such as `en-US`; defaults to the device language
  lang?: string
}

export interface SpeechSession {
  // finish listening; the final transcript arrives in `end`
  stop(): void
  // tear the session down with no further events
  abort(): void
}
