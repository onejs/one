import { Platform } from 'react-native'
import { NitroModules } from 'react-native-nitro-modules'
import { rethrowNativeError } from '../nativeError'
import type { AppIntentInvocation, OneAppIntents } from '../specs/OneAppIntents.nitro'
import { assertActionHandler } from './validate'

export type AppIntentHandler = (text: string | null) => string | Promise<string>

let hybrid: OneAppIntents | undefined
const handlers = new Map<string, AppIntentHandler>()

function native(): OneAppIntents {
  if (Platform.OS !== 'ios') throw new Error('AppIntents requires an iOS native build')
  hybrid ??= NitroModules.createHybridObject<OneAppIntents>('OneAppIntents')
  return hybrid
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function defineAction(identifier: string, handler: AppIntentHandler): () => void {
  assertActionHandler(identifier, handler)
  if (handlers.has(identifier)) {
    throw new Error(`AppIntents.defineAction: ${identifier} is already defined`)
  }
  handlers.set(identifier, handler)
  const dispatch = (invocation: AppIntentInvocation): void => {
    Promise.resolve()
      .then(() => handler(invocation.text ?? null))
      .then((result) => {
        if (typeof result !== 'string') {
          throw new TypeError('AppIntents action handler must return a string')
        }
        native().complete(invocation.executionId, true, result)
      })
      .catch((error: unknown) => {
        native().complete(invocation.executionId, false, errorMessage(error))
      })
  }
  let remove: (() => void) | undefined
  try {
    // subscription is future-only; this explicit pull claims cold requests.
    remove = native().addInvocationListener(identifier, dispatch)
    for (const invocation of native().claimPending(identifier)) dispatch(invocation)
  } catch (error) {
    remove?.()
    handlers.delete(identifier)
    rethrowNativeError(error)
  }
  return () => {
    if (handlers.get(identifier) !== handler) return
    handlers.delete(identifier)
    remove?.()
  }
}

export const AppIntents = Object.freeze({ defineAction })
