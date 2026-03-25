/**
 * HMR runtime for rolldown's devMode.
 * Ported from rollipop (https://github.com/leegeunhyeok/rollipop)
 *
 * this file is compiled to a string and passed to rolldown's
 * `devMode.implement` option. rolldown injects it at the top of the bundle
 * and references `__rolldown_runtime__` for module registration and HMR.
 */
import type { DevRuntime as DefaultDevRuntime, HMRContext, HMRCustomMessage } from './hmr-types';
import { enqueueUpdate, isReactRefreshBoundary } from './react-refresh-utils';
declare global {
    var __rolldown_runtime__: ReactNativeDevRuntime;
    var __turboModuleProxy: (moduleName: string) => any;
    var globalEvalWithSourceUrl: (code: string, sourceURL?: string) => void;
    var nativeModuleProxy: Record<string, any>;
    var __ReactRefresh: any;
    var __VXRN_CUSTOM_HMR_HANDLER__: ((socket: WebSocket, message: HMRCustomMessage) => void) | undefined;
}
declare const DevRuntime: typeof DefaultDevRuntime;
declare var BaseDevRuntime: typeof DefaultDevRuntime;
declare class ModuleHotContext implements HMRContext {
    private moduleId;
    private socketHolder;
    private readonly removeListeners;
    acceptCallbacks: {
        deps: string[];
        fn: (moduleExports: Record<string, any>[]) => void;
    }[];
    constructor(moduleId: string, socketHolder: SocketHolder);
    get refresh(): any;
    get refreshUtils(): {
        isReactRefreshBoundary: typeof isReactRefreshBoundary;
        enqueueUpdate: typeof enqueueUpdate;
    };
    accept(...args: any[]): void;
    invalidate(): void;
    on(event: string, listener: (...args: any[]) => void): void;
    off(event: string, listener: (...args: any[]) => void): void;
    send(type: string, payload?: unknown): void;
    cleanup(): void;
}
declare class SocketHolder {
    private readonly queuedMessages;
    private readonly emitter;
    private _socket;
    private _origin;
    get socket(): WebSocket | null;
    get origin(): string | null;
    setup(socket: WebSocket, origin: string): void;
    on(event: string, listener: (payload?: unknown) => void): void;
    off(event: string, listener: (payload?: unknown) => void): void;
    emit(event: string, payload?: unknown): void;
    send(message: string): void;
    flushQueuedMessages(): void;
    close(): void;
}
declare class ReactNativeDevRuntime extends BaseDevRuntime {
    socketHolder: SocketHolder;
    moduleHotContexts: Map<string, ModuleHotContext>;
    moduleHotContextsToBeUpdated: Map<string, ModuleHotContext>;
    constructor();
    createModuleHotContext(moduleId: string): ModuleHotContext;
    applyUpdates(boundaries: [string, string][]): void;
    setup(socket: WebSocket, origin: string): void;
    private evaluate;
    private reload;
}
export type { DevRuntime };
//# sourceMappingURL=hmr-runtime.d.ts.map