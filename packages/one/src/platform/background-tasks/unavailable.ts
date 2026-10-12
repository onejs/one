import { validateDefinition, validateSubmission, validateCancellation } from './validate'
import type {
  BackgroundTaskInvocation,
  PendingBackgroundTask,
} from '../specs/OneBackgroundTasks.nitro'

export type {
  BackgroundTaskInvocation,
  BackgroundTaskKind,
  PendingBackgroundTask,
} from '../specs/OneBackgroundTasks.nitro'

export interface BackgroundTaskContext extends BackgroundTaskInvocation {
  signal: AbortSignal
}

export type BackgroundTaskHandler = (task: BackgroundTaskContext) => Promise<void> | void

export const BackgroundTasks = Object.freeze({
  defineTask: (identifier: string, handler: BackgroundTaskHandler): (() => void) => {
    validateDefinition(identifier, handler)
    return () => {}
  },
  submit: (
    identifier: string,
    options: {
      earliestBeginDateMs?: number
      requiresNetworkConnectivity?: boolean
      requiresExternalPower?: boolean
    } = {}
  ): Promise<void> => {
    validateSubmission(identifier, options.earliestBeginDateMs)
    return Promise.resolve()
  },
  getPending: (): Promise<PendingBackgroundTask[]> => Promise.resolve([]),
  cancel: (identifier: string): void => {
    validateCancellation(identifier)
  },
})
