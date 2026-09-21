export type NotificationPermissionStatus = 'granted' | 'denied' | 'undetermined';
export interface NotificationPermissionRequest {
    ios?: {
        allowAlert?: boolean;
        allowBadge?: boolean;
        allowSound?: boolean;
        allowProvisional?: boolean;
    };
}
export interface NotificationPermissionResponse {
    status: NotificationPermissionStatus;
    granted: boolean;
    canAskAgain: boolean;
    ios?: {
        status: number;
    };
}
//# sourceMappingURL=types.d.ts.map