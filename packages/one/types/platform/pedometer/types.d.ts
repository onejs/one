export interface PedometerResult {
    steps: number;
}
export type PedometerPermissionStatus = 'granted' | 'denied' | 'undetermined';
export interface PedometerPermissionResponse {
    status: PedometerPermissionStatus;
    granted: boolean;
    canAskAgain: boolean;
}
export interface PedometerSubscription {
    remove(): void;
}
//# sourceMappingURL=types.d.ts.map