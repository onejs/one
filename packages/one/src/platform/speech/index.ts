import { Audio } from '../audio'
import type {
  SpeechEvent,
  SpeechErrorCode,
  SpeechPermissionResponse,
  SpeechSession,
  SpeechStartOptions,
} from './types'
export type * from './types'
type Recognition = EventTarget & {
  lang: string
  continuous: boolean
  interimResults: boolean
  start(): void
  stop(): void
  abort(): void
}
type RecognitionConstructor = new () => Recognition
function constructor(): RecognitionConstructor | undefined {
  if (typeof window === 'undefined') return undefined
  const browser = window as Window & {
    SpeechRecognition?: RecognitionConstructor
    webkitSpeechRecognition?: RecognitionConstructor
  }
  return browser.SpeechRecognition ?? browser.webkitSpeechRecognition
}
let abortLatest: (() => void) | undefined
let denied = false
async function permissions(request: boolean): Promise<SpeechPermissionResponse> {
  if (!constructor()) return { status: 'denied', granted: false, canAskAgain: false }
  const microphone = request
    ? await Audio.requestRecordingPermission()
    : await Audio.getRecordingPermissionStatus()
  const status = denied || microphone === 'denied' ? 'denied' : microphone
  return { status, granted: status === 'granted', canAskAgain: status !== 'denied' }
}
function start(
  options: SpeechStartOptions,
  onEvent: (event: SpeechEvent) => void
): SpeechSession {
  if (typeof onEvent !== 'function')
    throw new TypeError('Speech.start: onEvent must be a function')
  const Recognizer = constructor()
  if (!Recognizer) throw new Error('Speech.start needs an iOS or Android build')
  abortLatest?.()
  const recognition = new Recognizer()
  recognition.lang = options.lang ?? navigator.language
  recognition.continuous = true
  recognition.interimResults = true
  let active = true,
    transcript = ''
  const emit = (event: SpeechEvent) => {
    if (active) onEvent(event)
  }
  const terminal = (event: SpeechEvent) => {
    if (!active) return
    active = false
    if (abortLatest === abort) abortLatest = undefined
    onEvent(event)
  }
  const abort = () => {
    if (!active) return
    active = false
    if (abortLatest === abort) abortLatest = undefined
    recognition.abort()
  }
  abortLatest = abort
  recognition.addEventListener('start', () => emit({ type: 'start', transcript }))
  recognition.addEventListener('result', (event) => {
    if (!active) return
    const results = (
      event as Event & { results: ArrayLike<ArrayLike<{ transcript: string }>> }
    ).results
    const text = Array.from(results)
      .map((result) => result[0].transcript)
      .join(' ')
      .trim()
    if (text !== transcript) {
      transcript = text
      emit({ type: 'transcript', transcript })
    }
  })
  recognition.addEventListener('end', () => terminal({ type: 'end', transcript }))
  recognition.addEventListener('error', (event) => {
    const value = event as Event & { error: string; message: string }
    if (value.error === 'no-speech') {
      terminal({ type: 'end', transcript })
      return
    }
    const codes: Record<string, SpeechErrorCode> = {
      'not-allowed': 'not-allowed',
      'service-not-allowed': 'service-not-allowed',
      'language-not-supported': 'language-not-supported',
      'audio-capture': 'audio-capture',
      aborted: 'interrupted',
      network: 'network',
    }
    if (value.error === 'not-allowed' || value.error === 'service-not-allowed')
      denied = true
    terminal({
      type: 'error',
      transcript,
      error: codes[value.error] ?? 'unknown',
      message: value.message,
    })
  })
  try {
    recognition.start()
  } catch (error) {
    abort()
    throw error
  }
  return {
    stop: () => {
      if (active) recognition.stop()
    },
    abort,
  }
}
export const Speech = Object.freeze({
  isAvailable: (): boolean => !!constructor(),
  getPermissions: () => permissions(false),
  requestPermissions: () => permissions(true),
  start,
})
