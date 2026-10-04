import type { BackgroundTaskInvocation, PendingBackgroundTask } from '../specs/OneBackgroundTasks.nitro'

export type {
  BackgroundTaskInvocation, BackgroundTaskKind, PendingBackgroundTask,
} from '../specs/OneBackgroundTasks.nitro'

export interface BackgroundTaskContext extends BackgroundTaskInvocation {
  signal: AbortSignal
}

export type BackgroundTaskHandler = (task: BackgroundTaskContext) => Promise<void> | void

export const BackgroundTasks = Object.freeze({
  defineTask: (_identifier: string, _handler: BackgroundTaskHandler): (() => void) => () => {},
  submit: (_identifier: string, _options?: {
    earliestBeginDateMs?: number
    requiresNetworkConnectivity?: boolean
    requiresExternalPower?: boolean
  }): Promise<void> => Promise.resolve(),
  getPending: (): Promise<PendingBackgroundTask[]> => Promise.resolve([]),
  cancel: (_identifier: string): void => void 0,
})
