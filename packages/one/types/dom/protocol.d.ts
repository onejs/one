import { type DOMState } from './serialize';
import type { DOMError, DOMValue } from './types';
export declare const DOM_PROTOCOL_VERSION: 1;
export type DOMBootstrap = DOMState & {
    version: typeof DOM_PROTOCOL_VERSION;
    entryId: string;
    os: 'ios' | 'android';
    epoch: string;
};
type Envelope = {
    version: 1;
    epoch: string;
};
export type DOMMessage = Envelope & ({
    type: 'ready';
    revision: number;
} | ({
    type: 'state';
} & DOMState) | {
    type: 'call';
    requestId: string;
    name: string;
    args: DOMValue[];
} | {
    type: 'result';
    requestId: string;
    result: DOMResult;
} | {
    type: 'handle';
    methods: string[];
} | {
    type: 'size';
    width: number;
    height: number;
} | {
    type: 'error';
    error: DOMError;
} | {
    type: 'dispose';
});
export type DOMResult = {
    status: 'value';
    value: DOMValue;
} | {
    status: 'void';
} | {
    status: 'error';
    error: DOMError;
};
export declare function parseBootstrap(value: unknown, entryId: string): DOMBootstrap;
/** the same parser guards both directions before any handler is dispatched. */
export declare function parseMessage(raw: string): DOMMessage;
export {};
//# sourceMappingURL=protocol.d.ts.map