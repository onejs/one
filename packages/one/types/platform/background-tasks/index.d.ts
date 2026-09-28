import type { BackgroundTaskInvocation, PendingBackgroundTask } from '../specs/OneBackgroundTasks.nitro';
export type { BackgroundTaskInvocation, BackgroundTaskKind, PendingBackgroundTask, } from '../specs/OneBackgroundTasks.nitro';
export interface BackgroundTaskContext extends BackgroundTaskInvocation {
    signal: AbortSignal;
}
export type BackgroundTaskHandler = (task: BackgroundTaskContext) => Promise<void> | void;
export declare const BackgroundTasks: Readonly<{
    defineTask: (_identifier: string, _handler: BackgroundTaskHandler) => (() => void);
    submit: (_identifier: string, _options?: {
        earliestBeginDateMs?: number;
        requiresNetworkConnectivity?: boolean;
        requiresExternalPower?: boolean;
    }) => Promise<void>;
    getPending: () => Promise<PendingBackgroundTask[]>;
    cancel: (_identifier: string) => void;
}>;
//# sourceMappingURL=index.d.ts.map