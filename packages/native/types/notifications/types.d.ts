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
export declare const DEFAULT_ACTION_IDENTIFIER = "expo.modules.notifications.actions.DEFAULT";
export interface NotificationContentInput {
    title?: string;
    subtitle?: string;
    body?: string;
    data?: Record<string, unknown>;
    sound?: boolean;
    badge?: number;
}
export interface NotificationContent {
    title: string | null;
    subtitle: string | null;
    body: string | null;
    data: Record<string, unknown>;
    sound: boolean;
    badge: number | null;
}
export type NotificationTriggerInput = null | {
    type: 'timeInterval';
    seconds: number;
    repeats?: boolean;
    channelId?: string;
} | {
    type: 'date';
    date: number | Date;
    channelId?: string;
};
export interface NotificationScheduleInput {
    identifier?: string;
    content: NotificationContentInput;
    trigger: NotificationTriggerInput;
}
export type NotificationTrigger = {
    type: 'timeInterval';
    seconds: number;
    repeats: boolean;
} | {
    type: 'date';
    date: number;
} | {
    type: 'push';
} | {
    type: 'unknown';
};
export interface NotificationRequest {
    identifier: string;
    content: NotificationContent;
    trigger: NotificationTrigger;
}
export interface Notification {
    request: NotificationRequest;
    date: number;
}
export interface NotificationResponse {
    notification: Notification;
    actionIdentifier: string;
}
export interface NotificationBehavior {
    shouldShowBanner: boolean;
    shouldShowList: boolean;
    shouldPlaySound: boolean;
    shouldSetBadge: boolean;
}
export interface NotificationHandlerInput {
    handleNotification: (notification: Notification) => Promise<NotificationBehavior> | NotificationBehavior;
}
export interface NotificationSubscription {
    remove(): void;
}
//# sourceMappingURL=types.d.ts.map