/**
 * Simple registry for devtools functions.
 * This avoids circular dependencies by letting modules register their
 * devtools functions instead of router.ts importing them.
 */
type DevtoolsRegistry = {
    getLoaderTimingHistory?: () => any[];
};
export declare const devtoolsRegistry: DevtoolsRegistry;
/**
 * Register a devtools function. Called by modules like useLoader.ts
 */
export declare function registerDevtoolsFunction<K extends keyof DevtoolsRegistry>(key: K, fn: DevtoolsRegistry[K]): void;
export {};
//# sourceMappingURL=registry.d.ts.map