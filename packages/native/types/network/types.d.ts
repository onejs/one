export declare const NetworkStateType: {
    readonly NONE: 'NONE';
    readonly UNKNOWN: 'UNKNOWN';
    readonly CELLULAR: 'CELLULAR';
    readonly WIFI: 'WIFI';
    readonly BLUETOOTH: 'BLUETOOTH';
    readonly ETHERNET: 'ETHERNET';
    readonly WIMAX: 'WIMAX';
    readonly VPN: 'VPN';
    readonly OTHER: 'OTHER';
};
export type NetworkStateType = (typeof NetworkStateType)[keyof typeof NetworkStateType];
export interface NetworkState {
    type: NetworkStateType;
    isConnected: boolean;
    isInternetReachable: boolean;
}
export interface NetworkStateSubscription {
    remove(): void;
}
//# sourceMappingURL=types.d.ts.map