import type { BackgroundTaskInvocation, PendingBackgroundTask } from '../specs/OneBackgroundTasks.nitro';
export type { BackgroundTaskInvocation, BackgroundTaskKind, PendingBackgroundTask, } from '../specs/OneBackgroundTasks.nitro';
export interface BackgroundTaskContext extends BackgroundTaskInvocation {
    signal: AbortSignal;
}
export type BackgroundTaskHandler = (task: BackgroundTaskContext) => Promise<void> | void;
declare function defineTask(identifier: string, handler: BackgroundTaskHandler): () => void;
declare function submit(identifier: string, options?: {
    earliestBeginDateMs?: number;
    requiresNetworkConnectivity?: boolean;
    requiresExternalPower?: boolean;
}): Promise<void>;
declare function getPending(): Promise<PendingBackgroundTask[]>;
declare function cancel(identifier: string): void;
export declare const BackgroundTasks: Readonly<{
    defineTask: typeof defineTask;
    submit: typeof submit;
    getPending: typeof getPending;
    cancel: typeof cancel;
}>;
//# sourceMappingURL=index.native.d.ts.map