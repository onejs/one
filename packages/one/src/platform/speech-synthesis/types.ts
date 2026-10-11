// text-to-speech through the platform synthesizers, matching expo-speech's
// parameters, option names, payload fields and values. the function names
// drop expo's Async suffix and the words that repeat the namespace. the
// namespace is SpeechSynthesis (the web api and AVSpeechSynthesizer name)
// because One.Speech is speech recognition.
export type SpeechSynthesisVoiceQuality = 'default' | 'enhanced'

export interface SpeechSynthesisVoice {
  identifier: string
  language: string
  name: string
  quality: SpeechSynthesisVoiceQuality
}

export interface SpeechSynthesisOptions {
  // a BCP-47 tag such as `en-US`; defaults to the current voice's language
  language?: string
  // pitch multiplier; 1 is the normal pitch
  pitch?: number
  // rate multiplier; 1 is the normal rate
  rate?: number
  // a voice identifier from getAvailableVoices; defaults to the system voice
  voice?: string
  // a number between 0 (muted) and 1 (max volume); defaults to 1
  volume?: number
  // invoked when the utterance starts speaking
  onStart?: () => void
  // invoked when the utterance finishes speaking
  onDone?: () => void
  // invoked when the utterance is stopped by stop()
  onStopped?: () => void
  // invoked when the utterance fails, with the failure
  onError?: (error: Error) => void
}

export type SpeechSynthesisEventType = 'start' | 'done' | 'stopped' | 'error'

export interface SpeechSynthesisEvent {
  type: SpeechSynthesisEventType
  message?: string
}
