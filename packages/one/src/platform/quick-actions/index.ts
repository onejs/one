import type { QuickActionItem } from '../specs/OneQuickActions.nitro'
import { assertQuickActionItems, assertQuickActionListener } from './validate'

export type { QuickActionItem }

const unsupported = (): never => {
  throw new Error('QuickActions requires an iOS native build')
}

function setItems(items: QuickActionItem[]): Promise<void> {
  assertQuickActionItems(items)
  return unsupported()
}

function getItems(): Promise<QuickActionItem[]> {
  return unsupported()
}

function getInitialAction(): string | null {
  return unsupported()
}

function clearInitialAction(): void {
  unsupported()
}

function addListener(listener: (id: string) => void): () => void {
  assertQuickActionListener(listener)
  return unsupported()
}

export const QuickActions = Object.freeze({
  setItems, getItems, getInitialAction, clearInitialAction, addListener,
})
