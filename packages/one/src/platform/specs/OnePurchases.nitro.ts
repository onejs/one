import type { HybridObject } from 'react-native-nitro-modules'

export type PurchaseProductType =
  | 'consumable'
  | 'nonConsumable'
  | 'nonRenewable'
  | 'autoRenewable'
  | 'other'

export interface PurchaseProduct {
  id: string
  type: PurchaseProductType
  displayName: string
  description: string
  displayPrice: string
  currencyCode?: string
}

export interface PurchaseTransaction {
  // storekit transaction ids are uint64 values, so they cross js as strings.
  id: string
  originalId: string
  productId: string
  productType: PurchaseProductType
  purchaseDateMs: number
  expirationDateMs?: number
  revocationDateMs?: number
  jws: string
}

export type PurchaseStatus = 'purchased' | 'cancelled' | 'pending'

export interface PurchaseResult {
  status: PurchaseStatus
  transaction?: PurchaseTransaction
}

export type PurchaseUpdateStatus = 'verified' | 'unverified'

export interface PurchaseUpdate {
  status: PurchaseUpdateStatus
  transaction?: PurchaseTransaction
  error?: string
}

export interface OnePurchases extends HybridObject<{ ios: 'swift' }> {
  getProducts(productIds: string[]): Promise<PurchaseProduct[]>
  purchase(productId: string, appAccountToken?: string): Promise<PurchaseResult>
  getCurrentEntitlements(): Promise<PurchaseTransaction[]>
  getUnfinishedTransactions(): Promise<PurchaseTransaction[]>
  finishTransaction(transactionId: string): Promise<void>
  addTransactionListener(onUpdate: (update: PurchaseUpdate) => void): () => void
  sync(): Promise<void>
}
