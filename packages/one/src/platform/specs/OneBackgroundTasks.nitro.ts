import type { HybridObject } from 'react-native-nitro-modules'

export type BackgroundTaskKind = 'refresh' | 'processing'

export interface BackgroundTaskInvocation {
  executionId: string
  identifier: string
  kind: BackgroundTaskKind
}

export interface PendingBackgroundTask {
  identifier: string
  kind: BackgroundTaskKind
  earliestBeginDateMs?: number
  requiresNetworkConnectivity: boolean
  requiresExternalPower: boolean
}

export interface OneBackgroundTasks extends HybridObject<{ ios: 'swift' }> {
  submit(
    identifier: string,
    earliestBeginDateMs?: number,
    requiresNetworkConnectivity?: boolean,
    requiresExternalPower?: boolean
  ): Promise<void>
  getPending(): Promise<PendingBackgroundTask[]>
  cancel(identifier: string): void
  addTaskListener(
    onLaunch: (invocation: BackgroundTaskInvocation) => void,
    onExpire: (executionId: string) => void
  ): () => void
  complete(executionId: string, success: boolean): void
}
