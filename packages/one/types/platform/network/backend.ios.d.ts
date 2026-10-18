import type { NetworkState } from './types';
declare function getState(): Promise<NetworkState>;
declare function addStateListener(listener: (value: NetworkState) => void): () => void;
export declare function networkNative(): {
    getState: typeof getState;
    addStateListener: typeof addStateListener;
};
export {};
//# sourceMappingURL=backend.ios.d.ts.map