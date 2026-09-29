import type { HybridObject } from 'react-native-nitro-modules'

export interface AppIntentInvocation {
  executionId: string
  identifier: string
  text?: string
}

export interface OneAppIntents extends HybridObject<{ ios: 'swift' }> {
  addInvocationListener(identifier: string, listener: (invocation: AppIntentInvocation) => void): () => void
  claimPending(identifier: string): AppIntentInvocation[]
  complete(executionId: string, success: boolean, output: string): void
}
