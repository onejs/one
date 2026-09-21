import type { Notification, NotificationBehavior, NotificationHandlerInput } from './types';
export declare const showAllBehavior: NotificationBehavior;
export declare const suppressBehavior: NotificationBehavior;
export declare const HANDLER_TIMEOUT_MS = 2500;
export declare function normalizeBehavior(input: unknown): NotificationBehavior;
export declare class ForegroundHandler {
    private present;
    private timeoutMs;
    private handler;
    private nulled;
    private pending;
    constructor(present: (requestId: string, behavior: NotificationBehavior) => void, timeoutMs?: number);
    setHandler(handler: NotificationHandlerInput | null): void;
    receive(requestId: string, notification: Notification): boolean;
    private settle;
}
//# sourceMappingURL=handlerState.d.ts.map