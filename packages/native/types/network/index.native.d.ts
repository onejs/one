import { NetworkStateType, type NetworkState, type NetworkStateSubscription } from './types';
export { NetworkStateType };
export type { NetworkState, NetworkStateSubscription };
export declare function getNetworkStateAsync(): Promise<NetworkState>;
export declare function addNetworkStateListener(listener: (state: NetworkState) => void): NetworkStateSubscription;
export declare function useNetworkState(): NetworkState;
//# sourceMappingURL=index.native.d.ts.map