import { validateDefinition, validateSubmission, validateCancellation } from './validate'
import { AppRegistry, Platform } from 'react-native'
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
  if (Platform.OS !== 'ios' && Platform.OS !== 'android')
    throw new Error('BackgroundTasks requires a native build')
  hybrid ??= NitroModules.createHybridObject<OneBackgroundTasks>('OneBackgroundTasks')
  return hybrid
}

async function runInvocation(invocation: BackgroundTaskInvocation): Promise<void> {
  const controller = new AbortController()
  running.set(invocation.executionId, controller)
  try {
    const handler = handlers.get(invocation.identifier)
    if (!handler) {
      native().complete(invocation.executionId, false)
      return
    }
    try {
      await handler({ ...invocation, signal: controller.signal })
      native().complete(invocation.executionId, true)
    } catch {
      native().complete(invocation.executionId, false)
    }
  } finally {
    running.delete(invocation.executionId)
  }
}

// workmanager starts ReactHost without mounting a surface, then invokes this
// registered headless task. the setupFile must define handlers at module scope.
if (Platform.OS === 'android') {
  AppRegistry.registerHeadlessTask('OneBackgroundTasks', () => runInvocation)
}

function addNativeListener(): void {
  if (removeNativeListener) return
  removeNativeListener = native().addTaskListener(runInvocation, (executionId) => {
    running.get(executionId)?.abort()
  })
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

// iOS schedules through BGTaskScheduler and Android through WorkManager;
// other platforms keep the unavailable contract.
export const BackgroundTasks: typeof nativeBackgroundTasks =
  Platform.OS === 'ios' || Platform.OS === 'android'
    ? nativeBackgroundTasks
    : unavailableBackgroundTasks
