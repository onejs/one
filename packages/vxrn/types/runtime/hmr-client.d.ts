/**
 * HMR client for React Native.
 * Ported from rollipop (https://github.com/leegeunhyeok/rollipop)
 *
 * connects to dev server WebSocket, handles HMR messages,
 * and integrates with React Native's DevLoadingView and LogBox.
 */
import type { HMRClientLogLevel } from './hmr-types';
interface HMRClientNativeInterface {
    enable(): void;
    disable(): void;
    registerBundle(requestUrl: string): void;
    log(level: string, data: any[]): void;
    setup(platform: string, bundleEntry: string, host: string, port: number | string, isEnabled: boolean, scheme?: string): void;
}
declare class HMRClient implements HMRClientNativeInterface {
    static readonly STARTUP_ERROR = "Expected HMRClient.setup() call at startup";
    static readonly MAX_PENDING_LOGS = 100;
    private enabled;
    private _socketHolder;
    private unavailableMessage;
    private compileErrorMessage;
    private pendingUpdatesCount;
    private readonly pendingLogs;
    enable(): void;
    disable(): void;
    registerBundle(_requestUrl: string): void;
    log(level: HMRClientLogLevel, data: any[]): void;
    setup(platform: string, bundleEntry: string, host: string, port: number | string, isEnabled?: boolean, protocol?: string): void;
    private send;
    private flushEarlyLogs;
    private showCompileErrorIfNeeded;
    private handleConnection;
    private handleConnectionError;
    private handleMessage;
    private handleClose;
}
declare const _default: HMRClient;
export default _default;
//# sourceMappingURL=hmr-client.d.ts.map