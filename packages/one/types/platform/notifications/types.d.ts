export type NotificationPermissionStatus = 'granted' | 'denied' | 'undetermined';
export type IosAuthorizationStatus = 'notDetermined' | 'denied' | 'authorized' | 'provisional' | 'ephemeral';
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
        status: IosAuthorizationStatus;
    };
}
export declare function fromNativeAuthorizationStatus(status: number | IosAuthorizationStatus): IosAuthorizationStatus;
export type NotificationImportance = 'none' | 'min' | 'low' | 'default' | 'high' | 'max';
export declare function toNativeImportance(value: NotificationImportance | number): number;
export declare function fromNativeImportance(value: number): NotificationImportance;
export interface NotificationChannelInput {
    name: string;
    importance: NotificationImportance;
    description?: string;
    sound?: boolean;
    vibrationPattern?: number[];
    showBadge?: boolean;
}
export interface NotificationChannel {
    id: string;
    name: string;
    importance: NotificationImportance;
    description?: string;
    sound: boolean;
    vibrationPattern?: number[];
    showBadge: boolean;
}
export declare const DEFAULT_ACTION_IDENTIFIER = "expo.modules.notifications.actions.DEFAULT";
export interface NotificationActionOptions {
    isAuthenticationRequired?: boolean;
    isDestructive?: boolean;
    opensAppToForeground?: boolean;
}
export interface NotificationTextInput {
    placeholder: string;
    submitButtonTitle?: string;
}
export interface NotificationAction {
    identifier: string;
    buttonTitle: string;
    options?: NotificationActionOptions;
    textInput?: NotificationTextInput;
}
export interface NotificationCategoryOptions {
    allowInCarPlay?: boolean;
    allowAnnouncement?: boolean;
    categorySummaryFormat?: string;
    customDismissAction?: boolean;
    intentIdentifiers?: string[];
    previewPlaceholder?: string;
    showTitle?: boolean;
    showSubtitle?: boolean;
}
export interface NotificationCategory {
    identifier: string;
    actions: NotificationAction[];
    options?: NotificationCategoryOptions;
}
export declare function assertCategoryIdentifier(identifier: unknown, verb: string): asserts identifier is string;
export declare function assertCategoryActions(actions: unknown, verb: string): asserts actions is NotificationAction[];
export declare function assertCategoryOptions(options: NotificationCategoryOptions | undefined, verb: string): void;
export interface NotificationContentInput {
    title?: string;
    subtitle?: string;
    body?: string;
    data?: Record<string, unknown>;
    sound?: boolean;
    badge?: number;
    categoryIdentifier?: string;
}
export interface NotificationContent {
    title: string | null;
    subtitle: string | null;
    body: string | null;
    data: Record<string, unknown>;
    sound: boolean;
    badge: number | null;
    categoryIdentifier: string | null;
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
    userText?: string;
}
export interface ScheduledNotification {
    identifier: string;
    content: NotificationContent;
    trigger: NotificationTrigger;
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
export type DevicePushTokenType = 'ios' | 'android';
export interface DevicePushToken {
    type: DevicePushTokenType;
    data: string;
}
//# sourceMappingURL=types.d.ts.map