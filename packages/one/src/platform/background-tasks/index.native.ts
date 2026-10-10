import { validateDefinition, validateSubmission, validateCancellation } from './validate'
import { Platform } from 'react-native'
import { NitroModules } from 'react-native-nitro-modules'
import { rethrowNativeError } from '../nativeError'
import type {
  BackgroundTaskInvocation,
  OneBackgroundTasks,
  PendingBackgroundTask,
} from '../specs/OneBackgroundTasks.nitro'
import { BackgroundTasks as unavailableBackgroundTasks } from './unavailable'

export type {
  BackgroundTaskInvocation,
  BackgroundTaskKind,
  PendingBackgroundTask,
} from '../specs/OneBackgroundTasks.nitro'

export interface BackgroundTaskContext extends BackgroundTaskInvocation {
  signal: AbortSignal
}

export type BackgroundTaskHandler = (task: BackgroundTaskContext) => Promise<void> | void

let hybrid: OneBackgroundTasks | undefined
let removeNativeListener: (() => void) | undefined
const handlers = new Map<string, BackgroundTaskHandler>()
const running = new Map<string, AbortController>()

function native(): OneBackgroundTasks {
  if (Platform.OS !== 'ios')
    throw new Error('BackgroundTasks requires an iOS native build')
  hybrid ??= NitroModules.createHybridObject<OneBackgroundTasks>('OneBackgroundTasks')
  return hybrid
}

function addNativeListener(): void {
  if (removeNativeListener) return
  removeNativeListener = native().addTaskListener(
    (invocation) => {
      const controller = new AbortController()
      running.set(invocation.executionId, controller)
      const handler = handlers.get(invocation.identifier)
      if (!handler) {
        running.delete(invocation.executionId)
        native().complete(invocation.executionId, false)
        return
      }
      Promise.resolve()
        .then(() => handler({ ...invocation, signal: controller.signal }))
        .then(
          () => native().complete(invocation.executionId, true),
          () => native().complete(invocation.executionId, false)
        )
        .finally(() => running.delete(invocation.executionId))
    },
    (executionId) => {
      running.get(executionId)?.abort()
    }
  )
}

function defineTask(identifier: string, handler: BackgroundTaskHandler): () => void {
  validateDefinition(identifier, handler)
  if (handlers.has(identifier))
    throw new Error(`BackgroundTasks.defineTask: ${identifier} is already defined`)
  handlers.set(identifier, handler)
  try {
    addNativeListener()
  } catch (error) {
    handlers.delete(identifier)
    throw error
  }
  return () => {
    if (handlers.get(identifier) !== handler) return
    handlers.delete(identifier)
    if (handlers.size === 0) {
      removeNativeListener?.()
      removeNativeListener = undefined
    }
  }
}

function submit(
  identifier: string,
  options: {
    earliestBeginDateMs?: number
    requiresNetworkConnectivity?: boolean
    requiresExternalPower?: boolean
  } = {}
): Promise<void> {
  validateSubmission(identifier, options.earliestBeginDateMs)
  return native()
    .submit(
      identifier,
      options.earliestBeginDateMs,
      options.requiresNetworkConnectivity,
      options.requiresExternalPower
    )
    .catch(rethrowNativeError)
}

function getPending(): Promise<PendingBackgroundTask[]> {
  return native().getPending().catch(rethrowNativeError)
}

function cancel(identifier: string): void {
  validateCancellation(identifier)
  native().cancel(identifier)
}

const nativeBackgroundTasks = Object.freeze({ defineTask, submit, getPending, cancel })

const androidBackgroundTasks = Object.freeze({
  defineTask(identifier: string, handler: BackgroundTaskHandler): () => void {
    validateDefinition(identifier, handler)
    throw new Error('BackgroundTasks.defineTask requires an iOS native build')
  },
  submit(
    identifier: string,
    options: {
      earliestBeginDateMs?: number
      requiresNetworkConnectivity?: boolean
      requiresExternalPower?: boolean
    } = {}
  ): Promise<void> {
    validateSubmission(identifier, options.earliestBeginDateMs)
    return Promise.reject(
      new Error('BackgroundTasks.submit requires an iOS native build')
    )
  },
  getPending: unavailableBackgroundTasks.getPending,
  cancel(identifier: string): void {
    validateCancellation(identifier)
    throw new Error('BackgroundTasks.cancel requires an iOS native build')
  },
})

// bgtasks is iOS only; Android actions report that platform limit.
export const BackgroundTasks: typeof nativeBackgroundTasks =
  Platform.OS === 'android' ? androidBackgroundTasks : nativeBackgroundTasks
