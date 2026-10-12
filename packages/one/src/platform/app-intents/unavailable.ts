import { assertActionHandler } from './validate'

export type AppIntentHandler = (text: string | null) => string | Promise<string>

function defineAction(identifier: string, handler: AppIntentHandler): () => void {
  assertActionHandler(identifier, handler)
  return () => {}
}

export const AppIntents = Object.freeze({ defineAction })
