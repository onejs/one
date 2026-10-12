import type {
  SpeechSynthesisOptions as SpeakOptions,
  SpeechSynthesisVoice as OneVoice,
} from './types'
import { assertSpeakOptions, assertSpeakText } from './validate'

export type {
  SpeechSynthesisEvent,
  SpeechSynthesisEventType,
  SpeechSynthesisOptions,
  SpeechSynthesisVoice,
  SpeechSynthesisVoiceQuality,
} from './types'

// web entry. same signatures as the native entry: the published
// declarations are built from this file and serve both platforms. the
// browser's own speechSynthesis is the same job: utterances queue, stop
// cancels everything, voices map with default quality. without it, speak
// does nothing, reads report empty, and callbacks never fire.
function synthesis(): globalThis.SpeechSynthesis | undefined {
  if (typeof window === 'undefined') return undefined
  const candidate = window.speechSynthesis as globalThis.SpeechSynthesis | undefined
  return candidate && typeof candidate.speak === 'function' ? candidate : undefined
}

function readMaxInputLength(): number {
  return synthesis() ? 32767 : 0
}

function findVoice(
  synth: globalThis.SpeechSynthesis,
  name: string
): globalThis.SpeechSynthesisVoice | undefined {
  return synth.getVoices().find((voice) => voice.voiceURI === name || voice.name === name)
}

function toVoice(voice: globalThis.SpeechSynthesisVoice): OneVoice {
  return {
    identifier: voice.voiceURI,
    language: voice.lang,
    name: voice.name,
    quality: 'default',
  }
}

function speak(text: string, options?: SpeakOptions): void {
  assertSpeakText(text)
  assertSpeakOptions(options)
  const synth = synthesis()
  if (!synth) return
  const utterance = new SpeechSynthesisUtterance(text)
  if (options?.language !== undefined) utterance.lang = options.language
  if (options?.pitch !== undefined) utterance.pitch = options.pitch
  if (options?.rate !== undefined) utterance.rate = options.rate
  if (options?.volume !== undefined) utterance.volume = options.volume
  if (options?.voice !== undefined) {
    const voice = findVoice(synth, options.voice)
    if (voice) utterance.voice = voice
  }
  utterance.onstart = () => options?.onStart?.()
  utterance.onend = () => options?.onDone?.()
  utterance.onerror = (event) => {
    if (event.error === 'canceled') {
      options?.onStopped?.()
      return
    }
    options?.onError?.(new Error(`SpeechSynthesis.speak: ${event.error}`))
  }
  synth.speak(utterance)
}

async function stop(): Promise<void> {
  synthesis()?.cancel()
}

async function pause(): Promise<void> {
  synthesis()?.pause()
}

async function resume(): Promise<void> {
  synthesis()?.resume()
}

async function isSpeaking(): Promise<boolean> {
  const synth = synthesis()
  return synth ? synth.speaking : false
}

async function getAvailableVoices(): Promise<OneVoice[]> {
  const synth = synthesis()
  if (!synth) return []
  return synth.getVoices().map(toVoice)
}

export const SpeechSynthesis = Object.freeze({
  get maxInputLength() {
    return readMaxInputLength()
  },
  speak,
  stop,
  pause,
  resume,
  isSpeaking,
  getAvailableVoices,
})
