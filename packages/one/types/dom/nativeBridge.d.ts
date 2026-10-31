import { type DOMMessage } from './protocol';
import { type DOMState, serializeProps } from './serialize';
type Prepared = ReturnType<typeof serializeProps> & {
    state: DOMState;
};
/** React commits state here; rendering a speculative update never replaces handlers. */
export declare class DOMNativeBridge {
    private send;
    private notify;
    private onFailure;
    private development;
    private sequence;
    private committed;
    private peer?;
    private epoch?;
    private ready;
    private sentRevision;
    private epochs;
    constructor(initial: ReturnType<typeof serializeProps>, send: (raw: string) => void, notify: (message: DOMMessage | {
        type: 'document';
        epoch?: string;
    }) => void, onFailure: (error: unknown) => void, development?: boolean);
    prepare(serialized: ReturnType<typeof serializeProps>): Prepared;
    commit(prepared: Prepared): void;
    startDocument(epoch: string, revision: number): void;
    private reconcile;
    receive(raw: string): void;
    createHandle(methods: string[]): Record<string, (...args: unknown[]) => Promise<unknown>>;
    dispose(): void;
}
export {};
//# sourceMappingURL=nativeBridge.d.ts.map