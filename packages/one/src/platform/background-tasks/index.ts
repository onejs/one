import type { BackgroundTaskInvocation, PendingBackgroundTask } from '../specs/OneBackgroundTasks.nitro'

export type {
  BackgroundTaskInvocation, BackgroundTaskKind, PendingBackgroundTask,
} from '../specs/OneBackgroundTasks.nitro'

export interface BackgroundTaskContext extends BackgroundTaskInvocation {
  signal: AbortSignal
}

export type BackgroundTaskHandler = (task: BackgroundTaskContext) => Promise<void> | void

const unsupported = (): never => {
  throw new Error('BackgroundTasks requires an iOS native build')
}

export const BackgroundTasks = Object.freeze({
  defineTask: (_identifier: string, _handler: BackgroundTaskHandler): (() => void) => unsupported(),
  submit: (_identifier: string, _options?: {
    earliestBeginDateMs?: number
    requiresNetworkConnectivity?: boolean
    requiresExternalPower?: boolean
  }): Promise<void> => unsupported(),
  getPending: (): Promise<PendingBackgroundTask[]> => unsupported(),
  cancel: (_identifier: string): void => unsupported(),
})
