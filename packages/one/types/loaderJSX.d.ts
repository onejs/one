import * as React from 'react';
import type { JSXEnvelope } from './server/renderJSX.js';
export type RevivedLoaderData<T> = T extends JSXEnvelope ? React.ReactNode : T extends (...args: any[]) => any ? T : T extends readonly unknown[] ? {
    [K in keyof T]: RevivedLoaderData<T[K]>;
} : T extends object ? {
    [K in keyof T]: RevivedLoaderData<T[K]>;
} : T;
type ClientModule = Record<string, any>;
type ClientEntry = ClientModule | (() => Promise<ClientModule>);
/** register the exports of a `use client` module. a loader function code-splits it, a namespace is eager. */
export declare function registerLoaderClientModule(path: string, entry: ClientEntry): void;
/** register a single component under an exact client id, used for the universal preset */
export declare function registerLoaderClient(id: string, component: React.ComponentType<any>): void;
export type LoaderJSXSlots = Record<string, React.ComponentType<any> | React.ReactElement | ((props: any) => React.ReactNode)>;
export declare function isLoaderJSXEnvelope(value: unknown): value is JSXEnvelope;
/** revive an envelope to elements. memoized by envelope (and slots) reference so renders stay stable. */
export declare function reviveLoaderJSX(envelope: JSXEnvelope, slots?: LoaderJSXSlots): React.ReactNode;
/**
 * Replace every envelope inside loader data with its revived elements.
 * Data without envelopes is returned as-is, and the result is memoized per data reference.
 */
export declare function reviveLoaderData<T>(data: T): RevivedLoaderData<T>;
/** render a loader envelope, optionally filling named slots with client components */
export declare function ServerJSX(props: {
    value: JSXEnvelope;
    slots?: LoaderJSXSlots;
}): React.JSX.Element;
export {};
//# sourceMappingURL=loaderJSX.d.ts.map