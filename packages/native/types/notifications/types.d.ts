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
export declare const AndroidImportance: {
    readonly NONE: 0;
    readonly MIN: 1;
    readonly LOW: 2;
    readonly DEFAULT: 3;
    readonly HIGH: 4;
    readonly MAX: 5;
};
export type AndroidImportance = (typeof AndroidImportance)[keyof typeof AndroidImportance];
export interface NotificationChannelInput {
    name: string;
    importance: AndroidImportance;
    description?: string;
    sound?: boolean;
    vibrationPattern?: number[];
    showBadge?: boolean;
}
export interface NotificationChannel {
    id: string;
    name: string;
    importance: AndroidImportance;
    description?: string;
    sound: boolean;
    vibrationPattern?: number[];
    showBadge: boolean;
}
//# sourceMappingURL=types.d.ts.map