import { parseBootstrap } from './protocol';
import type { DOMImperativeHandle } from './types';
/** native installs this shim before application script and queues transport writes until ready. */
export type DOMTransport = {
    bootstrap: unknown;
    postMessage: (raw: string) => void;
    subscribe: (listener: (raw: string) => void) => () => void;
};
export declare class DOMBrowserBridge {
    private transport;
    private render;
    private onDispose;
    private onFailure;
    private development;
    readonly bootstrap: ReturnType<typeof parseBootstrap>;
    private peer;
    private current;
    private callbacks;
    private methods;
    private unsubscribe?;
    private live;
    private started;
    private handleRegistered;
    constructor(entryId: string, transport: DOMTransport, render: (props: Record<string, unknown>) => void, onDispose: () => void, onFailure: (error: unknown) => void, development?: boolean);
    start(): void;
    private props;
    private receiveControl;
    private post;
    setHandle(methods: DOMImperativeHandle): () => void;
    measure(width: number, height: number): void;
    reportError(error: unknown): void;
    dispose(notify?: boolean): void;
}
//# sourceMappingURL=browserBridge.d.ts.map