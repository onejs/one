import type { HybridObject } from 'react-native-nitro-modules'
import type { SpeechEvent, SpeechPermissionResponse, SpeechStartOptions } from '../speech/types'

// dictation behind One.Speech: SFSpeechRecognizer on iOS and the system
// SpeechRecognizer on Android. one session runs at a time; start replaces
// the running one, whose callback never fires again.
export interface OneSpeech extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  isAvailable(): boolean
  getPermissions(): Promise<SpeechPermissionResponse>
  requestPermissions(): Promise<SpeechPermissionResponse>
  start(options: SpeechStartOptions, onEvent: (event: SpeechEvent) => void): void
  stop(): void
  abort(): void
}
