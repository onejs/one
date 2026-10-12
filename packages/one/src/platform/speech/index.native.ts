import { NitroModules } from 'react-native-nitro-modules'
import { rethrowNativeError } from '../nativeError'
import type { OneSpeech } from '../specs/OneSpeech.nitro'
import type {
  SpeechEvent,
  SpeechPermissionResponse,
  SpeechSession,
  SpeechStartOptions,
} from './types'

export type * from './types'

let hybrid: OneSpeech | undefined

function native(): OneSpeech {
  hybrid ??= NitroModules.createHybridObject<OneSpeech>('OneSpeech')
  return hybrid
}

// native runs one session at a time, so a handle reaches it only while its
// session is the latest one started.
let latest = 0

function start(
  options: SpeechStartOptions,
  onEvent: (event: SpeechEvent) => void
): SpeechSession {
  if (typeof onEvent !== 'function') {
    throw new TypeError('Speech.start: onEvent must be a function')
  }
  const session = ++latest
  native().start(options, onEvent)
  return {
    stop: () => {
      if (session === latest) native().stop()
    },
    abort: () => {
      if (session === latest) native().abort()
    },
  }
}

export const Speech = Object.freeze({
  isAvailable: (): boolean => native().isAvailable(),
  getPermissions: (): Promise<SpeechPermissionResponse> =>
    native().getPermissions().catch(rethrowNativeError),
  requestPermissions: (): Promise<SpeechPermissionResponse> =>
    native().requestPermissions().catch(rethrowNativeError),
  start,
})
