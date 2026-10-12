import type { PurchaseProduct, PurchaseResult, PurchaseTransaction, PurchaseUpdate } from '../specs/OnePurchases.nitro';
export type { PurchaseProduct, PurchaseProductType, PurchaseResult, PurchaseStatus, PurchaseTransaction, PurchaseUpdate, PurchaseUpdateStatus, } from '../specs/OnePurchases.nitro';
declare function getProducts(productIds: string[]): Promise<PurchaseProduct[]>;
declare function purchase(productId: string, appAccountToken?: string): Promise<PurchaseResult>;
declare function getCurrentEntitlements(): Promise<PurchaseTransaction[]>;
declare function getUnfinishedTransactions(): Promise<PurchaseTransaction[]>;
declare function finishTransaction(transactionId: string): Promise<void>;
declare function addTransactionListener(onUpdate: (update: PurchaseUpdate) => void): () => void;
declare function sync(): Promise<void>;
declare const nativePurchases: Readonly<{
    getProducts: typeof getProducts;
    purchase: typeof purchase;
    getCurrentEntitlements: typeof getCurrentEntitlements;
    getUnfinishedTransactions: typeof getUnfinishedTransactions;
    finishTransaction: typeof finishTransaction;
    addTransactionListener: typeof addTransactionListener;
    sync: typeof sync;
}>;
export declare const Purchases: typeof nativePurchases;
//# sourceMappingURL=index.native.d.ts.map