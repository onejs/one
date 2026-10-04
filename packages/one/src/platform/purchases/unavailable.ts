import { missingNativeBuild } from '../nativeError'
import type {
  PurchaseProduct, PurchaseResult, PurchaseTransaction, PurchaseUpdate,
} from '../specs/OnePurchases.nitro'

export type {
  PurchaseProduct, PurchaseProductType, PurchaseResult, PurchaseStatus,
  PurchaseTransaction, PurchaseUpdate, PurchaseUpdateStatus,
} from '../specs/OnePurchases.nitro'

export const Purchases = Object.freeze({
  getProducts: (_productIds: string[]): Promise<PurchaseProduct[]> => Promise.resolve([]),
  purchase: (_productId: string, _appAccountToken?: string): Promise<PurchaseResult> => Promise.reject(missingNativeBuild('Purchases.purchase')),
  getCurrentEntitlements: (): Promise<PurchaseTransaction[]> => Promise.reject(missingNativeBuild('Purchases.getCurrentEntitlements')),
  getUnfinishedTransactions: (): Promise<PurchaseTransaction[]> => Promise.reject(missingNativeBuild('Purchases.getUnfinishedTransactions')),
  finishTransaction: (_transactionId: string): Promise<void> => Promise.reject(missingNativeBuild('Purchases.finishTransaction')),
  addTransactionListener: (_onUpdate: (update: PurchaseUpdate) => void): (() => void) => () => {},
  sync: (): Promise<void> => Promise.reject(missingNativeBuild('Purchases.sync')),
})
