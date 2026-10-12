import type { PedometerPermissionResponse, PedometerResult, PedometerSubscription } from './types';
export type { PedometerPermissionResponse, PedometerPermissionStatus, PedometerResult, PedometerSubscription, } from './types';
declare function isAvailable(): boolean;
declare function watchStepCount(listener: (result: PedometerResult) => void): PedometerSubscription;
declare function getStepCount(start: Date, end: Date): Promise<PedometerResult>;
declare function getPermissions(): Promise<PedometerPermissionResponse>;
declare function requestPermissions(): Promise<PedometerPermissionResponse>;
export declare const Pedometer: Readonly<{
    isAvailable: typeof isAvailable;
    watchStepCount: typeof watchStepCount;
    getStepCount: typeof getStepCount;
    getPermissions: typeof getPermissions;
    requestPermissions: typeof requestPermissions;
}>;
//# sourceMappingURL=index.native.d.ts.map