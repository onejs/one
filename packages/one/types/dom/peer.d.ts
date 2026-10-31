import { type DOMMessage } from './protocol';
import type { DOMValue } from './types';
type Handler = (...args: DOMValue[]) => unknown;
/** one peer and one pending map belong to exactly one host document. */
export declare class DOMPeer {
    readonly epoch: string;
    private side;
    private send;
    private lookup;
    private onMessage;
    private onFailure;
    private development;
    private pending;
    private lastReceived;
    private sequence;
    private live;
    constructor(epoch: string, side: 'native' | 'browser', send: (raw: string) => void, lookup: (name: string) => Handler | undefined, onMessage: (message: DOMMessage) => void, onFailure: (error: unknown) => void, development?: boolean);
    post(message: DOMMessage): void;
    call(name: string, args: unknown[]): Promise<DOMValue | void>;
    receive(raw: string): void;
    private receiveMessage;
    private dispatch;
    dispose(reason?: Error): void;
}
export {};
//# sourceMappingURL=peer.d.ts.map