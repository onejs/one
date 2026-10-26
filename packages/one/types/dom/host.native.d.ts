import type { DOMProps } from './types';
/** the native transform replaces only the default export with this host proxy. */
export declare function createDOMComponent<P extends object = Record<string, unknown>, Handle extends object = Record<string, (...args: unknown[]) => Promise<unknown>>>(entryId: string): import("react").ForwardRefExoticComponent<import("react").PropsWithoutRef<P & {
    dom?: DOMProps;
}> & import("react").RefAttributes<Handle>>;
//# sourceMappingURL=host.native.d.ts.map