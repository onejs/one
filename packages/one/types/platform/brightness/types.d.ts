export type BrightnessMode = 'unknown' | 'automatic' | 'manual';
export type BrightnessPermissionStatus = 'granted' | 'denied' | 'undetermined';
export interface BrightnessPermissionResponse {
    status: BrightnessPermissionStatus;
    granted: boolean;
    canAskAgain: boolean;
}
export interface BrightnessEvent {
    brightness: number;
}
export interface BrightnessSubscription {
    remove(): void;
}
//# sourceMappingURL=types.d.ts.map