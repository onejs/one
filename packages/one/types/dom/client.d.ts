import { type ComponentType } from 'react';
import { type DOMTransport } from './browserBridge';
declare global {
    var __oneDOM: DOMTransport | undefined;
}
/** browser-only virtual entries call this once; inline web components use normal React. */
export declare function mountDOMComponent(Component: ComponentType<any>, entryId: string): () => void;
//# sourceMappingURL=client.d.ts.map