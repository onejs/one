import type {
  PurchaseProduct, PurchaseResult, PurchaseTransaction, PurchaseUpdate,
} from '../specs/OnePurchases.nitro'

export type {
  PurchaseProduct, PurchaseProductType, PurchaseResult, PurchaseStatus,
  PurchaseTransaction, PurchaseUpdate, PurchaseUpdateStatus,
} from '../specs/OnePurchases.nitro'

const unsupported = (): never => {
  throw new Error('Purchases requires an iOS native build')
}

export const Purchases = Object.freeze({
  getProducts: (_productIds: string[]): Promise<PurchaseProduct[]> => unsupported(),
  purchase: (_productId: string, _appAccountToken?: string): Promise<PurchaseResult> => unsupported(),
  getCurrentEntitlements: (): Promise<PurchaseTransaction[]> => unsupported(),
  getUnfinishedTransactions: (): Promise<PurchaseTransaction[]> => unsupported(),
  finishTransaction: (_transactionId: string): Promise<void> => unsupported(),
  addTransactionListener: (_onUpdate: (update: PurchaseUpdate) => void): (() => void) => unsupported(),
  sync: (): Promise<void> => unsupported(),
})
