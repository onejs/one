export type NetworkStateType = 'none' | 'unknown' | 'cellular' | 'wifi' | 'bluetooth' | 'ethernet' | 'wimax' | 'vpn' | 'other';
export interface NetworkState {
    type: NetworkStateType;
    isConnected: boolean;
    isInternetReachable: boolean;
}
export interface NetworkStateSubscription {
    remove(): void;
}
//# sourceMappingURL=types.d.ts.map