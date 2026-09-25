import type { NetworkState, NetworkStateSubscription } from './types';
export type { NetworkState, NetworkStateSubscription, NetworkStateType } from './types';
declare function getState(): Promise<NetworkState>;
declare function addStateListener(listener: (state: NetworkState) => void): NetworkStateSubscription;
declare function useNetworkState(): NetworkState;
export declare const Network: Readonly<{
    getState: typeof getState;
    addStateListener: typeof addStateListener;
}>;
export { useNetworkState };
//# sourceMappingURL=index.native.d.ts.map