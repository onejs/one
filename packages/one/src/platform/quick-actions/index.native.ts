import { Platform } from 'react-native'
import { NitroModules } from 'react-native-nitro-modules'
import { rethrowNativeError } from '../nativeError'
import type { OneQuickActions, QuickActionItem } from '../specs/OneQuickActions.nitro'
import { assertQuickActionItems, assertQuickActionListener } from './validate'

export type { QuickActionItem }

let hybrid: OneQuickActions | undefined

function native(): OneQuickActions {
  if (Platform.OS !== 'ios') throw new Error('QuickActions requires an iOS native build')
  hybrid ??= NitroModules.createHybridObject<OneQuickActions>('OneQuickActions')
  return hybrid
}

function setItems(items: QuickActionItem[]): Promise<void> {
  assertQuickActionItems(items)
  return native().setItems(items).catch(rethrowNativeError)
}

function getItems(): Promise<QuickActionItem[]> {
  return native().getItems().catch(rethrowNativeError)
}

function getInitialAction(): string | null {
  return native().getInitialAction() ?? null
}

function clearInitialAction(): void {
  native().clearInitialAction()
}

function addListener(listener: (id: string) => void): () => void {
  assertQuickActionListener(listener)
  return native().addListener(listener)
}

export const QuickActions = Object.freeze({
  setItems, getItems, getInitialAction, clearInitialAction, addListener,
})
