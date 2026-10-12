import type { QuickActionItem } from '../specs/OneQuickActions.nitro'
import { assertQuickActionItems, assertQuickActionListener } from './validate'

export type { QuickActionItem }

function setItems(items: QuickActionItem[]): Promise<void> {
  assertQuickActionItems(items)
  return Promise.resolve()
}

function getItems(): Promise<QuickActionItem[]> {
  return Promise.resolve([])
}

function getInitialAction(): string | null {
  return null
}

function clearInitialAction(): void {
  return void 0
}

function addListener(listener: (id: string) => void): () => void {
  assertQuickActionListener(listener)
  return () => {}
}

export const QuickActions = Object.freeze({
  setItems,
  getItems,
  getInitialAction,
  clearInitialAction,
  addListener,
})
