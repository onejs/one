import * as React from 'react';
export type JSXEnvelopeNode = string | number | null | ['h', string, Record<string, any>, ...JSXEnvelopeNode[]] | ['c', string, Record<string, any>, JSXEnvelopeNode?] | ['s', string, Record<string, any>, JSXEnvelopeNode?] | ['f', ...JSXEnvelopeNode[]];
export type JSXEnvelope = {
    __oneJSX: JSXEnvelopeNode;
};
type SlotProps = {
    name: string;
    children?: React.ReactNode;
    [key: string]: any;
};
/** a named hole the client fills in with a component, rendered as `children` until then */
export declare function JSXSlot(_props: SlotProps): React.ReactElement;
/** shows `fallback` in place of a client component whose id the running client does not know */
export declare function ClientFallback(_props: {
    fallback: React.ReactNode;
    children?: React.ReactNode;
}): React.ReactElement;
/**
 * Walk a React element tree on the server and return a JSON envelope for a loader to return.
 * Server components run here; `use client` components and universal primitives stay as references.
 */
export declare function renderJSX(element: React.ReactNode): Promise<JSXEnvelope>;
export {};
//# sourceMappingURL=renderJSX.d.ts.map