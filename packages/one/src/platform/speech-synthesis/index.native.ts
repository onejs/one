import { NitroModules } from 'react-native-nitro-modules'
import { rethrowNativeError } from '../nativeError'
import type { OneSpeechSynthesis } from '../specs/OneSpeechSynthesis.nitro'
import type {
  SpeechSynthesisEvent,
  SpeechSynthesisOptions,
  SpeechSynthesisVoice,
} from './types'
import { assertSpeakOptions, assertSpeakText } from './validate'

export type {
  SpeechSynthesisEvent,
  SpeechSynthesisEventType,
  SpeechSynthesisOptions,
  SpeechSynthesisVoice,
  SpeechSynthesisVoiceQuality,
} from './types'

// text-to-speech matching expo-speech, backed by the OneSpeechSynthesis
// nitro hybrid object (created on first use and cached). speak queues while
// another utterance speaks; each speak carries its own event callback, which
// fans out to that call's option callbacks. stop clears the queue and the
// interrupted utterance reports stopped.
let hybrid: OneSpeechSynthesis | undefined

function native(): OneSpeechSynthesis {
  hybrid ??= NitroModules.createHybridObject<OneSpeechSynthesis>('OneSpeechSynthesis')
  return hybrid
}

// fixed for the life of the process: the binary's limit, read once. a
// binary without the module (an old build) reports zero.
function readMaxInputLength(): number {
  if (!NitroModules.hasHybridObject('OneSpeechSynthesis')) return 0
  return native().maxInputLength
}

function dispatch(
  options: SpeechSynthesisOptions | undefined,
  event: SpeechSynthesisEvent
): void {
  switch (event.type) {
    case 'start':
      options?.onStart?.()
      break
    case 'done':
      options?.onDone?.()
      break
    case 'stopped':
      options?.onStopped?.()
      break
    case 'error':
      options?.onError?.(
        new Error(event.message ?? 'SpeechSynthesis.speak: synthesis failed')
      )
      break
  }
}

function speak(text: string, options?: SpeechSynthesisOptions): void {
  assertSpeakText(text)
  assertSpeakOptions(options)
  const { onStart, onDone, onStopped, onError, ...utterance } = options ?? {}
  const callbacks = { onStart, onDone, onStopped, onError }
  native().speak({ text, ...utterance }, (event) => dispatch(callbacks, event))
}

function stop(): Promise<void> {
  return native().stop().catch(rethrowNativeError)
}

function pause(): Promise<void> {
  return native().pause().catch(rethrowNativeError)
}

function resume(): Promise<void> {
  return native().resume().catch(rethrowNativeError)
}

function isSpeaking(): Promise<boolean> {
  return native().isSpeaking().catch(rethrowNativeError)
}

function getAvailableVoices(): Promise<SpeechSynthesisVoice[]> {
  return native().getAvailableVoices().catch(rethrowNativeError)
}

export const SpeechSynthesis = Object.freeze({
  maxInputLength: readMaxInputLength(),
  speak,
  stop,
  pause,
  resume,
  isSpeaking,
  getAvailableVoices,
})
