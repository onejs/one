import { type ComponentType, type LazyExoticComponent } from 'react';
import { loadWithRetry } from './utils/dynamicImport';
export declare function lazyWithRetry<T extends ComponentType<any>>(loader: () => Promise<{
    default: T;
}>, options?: Parameters<typeof loadWithRetry>[1]): LazyExoticComponent<T>;
//# sourceMappingURL=lazyWithRetry.d.ts.map