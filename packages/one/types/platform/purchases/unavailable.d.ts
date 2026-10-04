import type { PurchaseProduct, PurchaseResult, PurchaseTransaction, PurchaseUpdate } from '../specs/OnePurchases.nitro';
export type { PurchaseProduct, PurchaseProductType, PurchaseResult, PurchaseStatus, PurchaseTransaction, PurchaseUpdate, PurchaseUpdateStatus, } from '../specs/OnePurchases.nitro';
export declare const Purchases: Readonly<{
    getProducts: (_productIds: string[]) => Promise<PurchaseProduct[]>;
    purchase: (_productId: string, _appAccountToken?: string) => Promise<PurchaseResult>;
    getCurrentEntitlements: () => Promise<PurchaseTransaction[]>;
    getUnfinishedTransactions: () => Promise<PurchaseTransaction[]>;
    finishTransaction: (_transactionId: string) => Promise<void>;
    addTransactionListener: (_onUpdate: (update: PurchaseUpdate) => void) => (() => void);
    sync: () => Promise<void>;
}>;
//# sourceMappingURL=unavailable.d.ts.map