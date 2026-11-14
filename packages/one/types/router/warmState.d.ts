import type { OneRouter } from '../interfaces/router.js';
import type { One } from '../vite/types.js';
import type { OneLinkingOptions } from './getLinkingConfig.js';
import type { RouteNode } from './Route.js';
import { type WarmStartOptions, type WarmStateEnvelope, type WarmStateStorage } from './warmStateShared.js';
export type { WarmNavigationSnapshot, WarmRouteSnapshot, WarmStartOptions, WarmStateEnvelope, WarmStateStorage, } from './warmStateShared.js';
export type WarmStateSource<T = unknown> = {
    getSnapshot: () => T;
    hydrate: (value: T) => void;
    validate?: (value: unknown) => value is T;
};
/** configure warm boot behavior and optional storage/clock adapters. */
export declare function configureWarmState(options: WarmStartOptions & {
    storage?: WarmStateStorage;
    now?: () => number;
}): void;
/** apply createApp flags.warmStart on client and native runtimes. */
export declare function configureWarmStateFromFlags(flags?: One.Flags): void;
export declare function isWarmStateEnabled(): boolean;
export declare function shouldRestoreWarmRoute(): boolean;
/**
 * register a named client state slice to persist on a background thread and
 * hydrate synchronously on warm launch before first render.
 */
export declare function registerWarmStateSource<T>(key: string, source: WarmStateSource<T>): () => void;
export declare function getHydratedWarmState(): WarmStateEnvelope | null;
/**
 * synchronously read and validate cached warm state, hydrate registered state
 * slices before first render, and warm up saved route modules in parallel.
 */
export declare function hydrateWarmInitialLoad(options?: {
    routes?: Record<string, () => Promise<unknown>>;
    flags?: One.Flags;
}): WarmStateEnvelope | null;
/** consume validated initial navigation state for instant first-frame mount. */
export declare function consumeWarmInitialNavigationState(routeNode: RouteNode | null, linking?: OneLinkingOptions): OneRouter.ResultState | undefined;
/** check whether web SPA root is eligible to mount directly into saved warm route. */
/** check dynamically whether runtime and initial url allow warm route restoration. */
export declare function shouldAttemptWarmRouteRestore(initialLocation?: URL): boolean;
export declare function isWarmWebRestoreEligible(initialLocation?: URL): boolean;
export declare function consumeWarmRouteApplied(): boolean;
/** schedule off-thread serialization and storage persistence of latest route + sources. */
export declare function scheduleWarmStatePersist(navState?: unknown, pathname?: string): void;
/** synchronously persist any queued warm state before backgrounding or termination. */
export declare function flushWarmState(): boolean;
/** clear persisted warm snapshot and reset cached boot state. */
export declare function clearWarmState(options?: {
    keepConfig?: boolean;
}): void;
/**
 * reconcile a cold native launch url after mounting synchronously from warm state.
 * normal springboard launches resolve null and leave the warm screen untouched.
 */
export declare function reconcileNativeColdDeepLink(options: {
    getInitialURL: () => Promise<string | null>;
    prefixes?: string[];
    currentPathname?: string;
    navigateTo: (href: string) => void;
}): Promise<string | null>;
//# sourceMappingURL=warmState.d.ts.map