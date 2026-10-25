import type { DOMError, DOMValue } from './types';
export declare class DOMBridgeError extends Error {
    code: string;
    constructor(message: string, code?: string);
}
/** validate before JSON.stringify can silently drop or coerce unsupported data. */
export declare function serializeData(value: unknown, path?: string): DOMValue;
export type DOMActions = Map<string, (...args: any[]) => unknown>;
export type DOMState = {
    revision: number;
    props: Record<string, DOMValue>;
    actions: string[];
};
export declare function serializeProps(props: Record<string, unknown>): {
    props: Record<string, DOMValue>;
    actions: DOMActions;
    key: string;
};
export declare function serializeError(error: unknown, development?: boolean): DOMError;
export declare function deserializeError(error: DOMError): Error;
//# sourceMappingURL=serialize.d.ts.map