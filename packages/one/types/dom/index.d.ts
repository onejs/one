import { type DependencyList, type Ref } from 'react';
import type { DOMValue } from './types.js';
export type { DOMProps, DOMValue, DOMError, DOMErrorEvent, DOMLoadEvent, DOMImperativeHandle, DOMAction, } from './types.js';
/** expose async methods on both inline web components and hosted native components. */
export declare function useDOMImperativeHandle<T extends {
    [K in keyof T]: (...args: any[]) => Promise<DOMValue | void>;
}>(ref: Ref<T> | undefined, factory: () => T, deps: DependencyList): void;
//# sourceMappingURL=index.d.ts.map