declare global {
    var __VXRN_ON_MODULE_UPDATED__: ((moduleId: string) => void) | undefined;
}
export declare const subscribeRouteHmr: (onStoreChange: () => void) => () => void;
export declare const getRouteHmrEpoch: () => number;
//# sourceMappingURL=routeHmr.native.d.ts.map