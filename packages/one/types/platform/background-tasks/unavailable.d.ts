import type { BackgroundTaskInvocation, PendingBackgroundTask } from '../specs/OneBackgroundTasks.nitro';
export type { BackgroundTaskInvocation, BackgroundTaskKind, PendingBackgroundTask, } from '../specs/OneBackgroundTasks.nitro';
export interface BackgroundTaskContext extends BackgroundTaskInvocation {
    signal: AbortSignal;
}
export type BackgroundTaskHandler = (task: BackgroundTaskContext) => Promise<void> | void;
export declare const BackgroundTasks: Readonly<{
    defineTask: (identifier: string, handler: BackgroundTaskHandler) => (() => void);
    submit: (identifier: string, options?: {
        earliestBeginDateMs?: number;
        requiresNetworkConnectivity?: boolean;
        requiresExternalPower?: boolean;
    }) => Promise<void>;
    getPending: () => Promise<PendingBackgroundTask[]>;
    cancel: (identifier: string) => void;
}>;
//# sourceMappingURL=unavailable.d.ts.map