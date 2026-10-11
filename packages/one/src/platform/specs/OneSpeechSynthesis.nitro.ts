import type { HybridObject } from 'react-native-nitro-modules'
import type {
  SpeechSynthesisEvent,
  SpeechSynthesisVoice,
} from '../speech-synthesis/types'

export interface SpeechSynthesisUtterance {
  text: string
  language?: string
  pitch?: number
  rate?: number
  voice?: string
  volume?: number
}

// text-to-speech behind One.SpeechSynthesis, matching expo-speech: utterances
// queue while another speaks, stop clears the queue, pause and resume are
// ios only. each speak carries its own event callback; the matching option
// callbacks fire from it.
export interface OneSpeechSynthesis extends HybridObject<{
  ios: 'swift'
  android: 'kotlin'
}> {
  // the longest text a single speak accepts. ios reports no limit.
  readonly maxInputLength: number
  speak(
    utterance: SpeechSynthesisUtterance,
    onEvent: (event: SpeechSynthesisEvent) => void
  ): void
  stop(): Promise<void>
  pause(): Promise<void>
  resume(): Promise<void>
  isSpeaking(): Promise<boolean>
  getAvailableVoices(): Promise<SpeechSynthesisVoice[]>
}
