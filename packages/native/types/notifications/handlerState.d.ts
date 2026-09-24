import type { Notification, NotificationBehavior, NotificationHandlerInput } from './types';
export declare const showAllBehavior: NotificationBehavior;
export declare const suppressBehavior: NotificationBehavior;
export declare function normalizeBehavior(input: unknown): NotificationBehavior;
export declare class ForegroundHandler {
    private present;
    private handler;
    private nulled;
    private pending;
    constructor(present: (requestId: string, behavior: NotificationBehavior) => void);
    setHandler(handler: NotificationHandlerInput | null): void;
    receive(requestId: string, notification: Notification): boolean;
    private settle;
}
//# sourceMappingURL=handlerState.d.ts.map