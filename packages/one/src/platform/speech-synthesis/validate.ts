import type { SpeechSynthesisOptions } from './types'

// shared argument checks: identical checks and messages on web and native.
export function assertSpeakText(text: unknown): asserts text is string {
  if (typeof text !== 'string' || text.length === 0) {
    throw new Error('SpeechSynthesis.speak: text must be a non-empty string')
  }
}

export function assertSpeakOptions(
  options: unknown
): asserts options is SpeechSynthesisOptions {
  if (options === undefined) return
  if (typeof options !== 'object' || options === null || Array.isArray(options)) {
    throw new Error('SpeechSynthesis.speak: options must be an object')
  }
  const { language, pitch, rate, voice, volume, onStart, onDone, onStopped, onError } =
    options as SpeechSynthesisOptions
  if (language !== undefined && typeof language !== 'string') {
    throw new Error('SpeechSynthesis.speak: language must be a BCP-47 string')
  }
  if (pitch !== undefined && (typeof pitch !== 'number' || !Number.isFinite(pitch))) {
    throw new Error('SpeechSynthesis.speak: pitch must be a finite number')
  }
  if (rate !== undefined && (typeof rate !== 'number' || !Number.isFinite(rate))) {
    throw new Error('SpeechSynthesis.speak: rate must be a finite number')
  }
  if (voice !== undefined && typeof voice !== 'string') {
    throw new Error('SpeechSynthesis.speak: voice must be a string')
  }
  if (
    volume !== undefined &&
    (typeof volume !== 'number' || !Number.isFinite(volume) || volume < 0 || volume > 1)
  ) {
    throw new Error('SpeechSynthesis.speak: volume must be a number between 0 and 1')
  }
  for (const [name, callback] of [
    ['onStart', onStart],
    ['onDone', onDone],
    ['onStopped', onStopped],
    ['onError', onError],
  ] as const) {
    if (callback !== undefined && typeof callback !== 'function') {
      throw new Error(`SpeechSynthesis.speak: ${name} must be a function`)
    }
  }
}
