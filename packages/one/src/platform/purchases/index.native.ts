import { validateCallback } from '../validateCallback'
import { Platform } from 'react-native'
import { NitroModules } from 'react-native-nitro-modules'
import { rethrowNativeError } from '../nativeError'
import type {
  OnePurchases,
  PurchaseProduct,
  PurchaseResult,
  PurchaseTransaction,
  PurchaseUpdate,
} from '../specs/OnePurchases.nitro'
import { Purchases as unavailablePurchases } from './unavailable'

export type {
  PurchaseProduct,
  PurchaseProductType,
  PurchaseResult,
  PurchaseStatus,
  PurchaseTransaction,
  PurchaseUpdate,
  PurchaseUpdateStatus,
} from '../specs/OnePurchases.nitro'

let hybrid: OnePurchases | undefined

function native(): OnePurchases {
  if (Platform.OS !== 'ios') throw new Error('Purchases requires an iOS native build')
  hybrid ??= NitroModules.createHybridObject<OnePurchases>('OnePurchases')
  return hybrid
}

function getProducts(productIds: string[]): Promise<PurchaseProduct[]> {
  return native().getProducts(productIds).catch(rethrowNativeError)
}

function purchase(productId: string, appAccountToken?: string): Promise<PurchaseResult> {
  return native().purchase(productId, appAccountToken).catch(rethrowNativeError)
}

function getCurrentEntitlements(): Promise<PurchaseTransaction[]> {
  return native().getCurrentEntitlements().catch(rethrowNativeError)
}

function getUnfinishedTransactions(): Promise<PurchaseTransaction[]> {
  return native().getUnfinishedTransactions().catch(rethrowNativeError)
}

function finishTransaction(transactionId: string): Promise<void> {
  return native().finishTransaction(transactionId).catch(rethrowNativeError)
}

function addTransactionListener(onUpdate: (update: PurchaseUpdate) => void): () => void {
  validateCallback(onUpdate, 'Purchases.addTransactionListener requires a function')
  return native().addTransactionListener(onUpdate)
}

function sync(): Promise<void> {
  return native().sync().catch(rethrowNativeError)
}

const nativePurchases = Object.freeze({
  getProducts,
  purchase,
  getCurrentEntitlements,
  getUnfinishedTransactions,
  finishTransaction,
  addTransactionListener,
  sync,
})

// StoreKit is iOS only, so Android keeps the unavailable contract
export const Purchases: typeof nativePurchases =
  Platform.OS === 'android' ? unavailablePurchases : nativePurchases
