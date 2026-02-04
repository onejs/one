import type { DaemonState } from './types';
type RouteMode = 'most-recent' | 'ask';
export declare function getRouteMode(): RouteMode;
export declare function startTUI(state: DaemonState): void;
export declare function stopTUI(): void;
export declare function triggerPulse(_serverId: string, _direction: 'request' | 'response'): void;
export {};
//# sourceMappingURL=tui.d.ts.map