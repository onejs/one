/**
 * Functions in this file are copied from Vite `packages/vite/src/node/typeUtils.ts`.
 * Changes are marked with `// vxrn`.
 * Note that not all functions are copied.
 */
import type { ObjectHook, Plugin as RollupPlugin, PluginContext as RollupPluginContext } from 'rollup';
export type NonNeverKeys<T> = {
    [K in keyof T]: T[K] extends never ? never : K;
}[keyof T];
export type GetHookContextMap<Plugin> = {
    [K in keyof Plugin]-?: Plugin[K] extends ObjectHook<infer T, infer B> ? T extends (this: infer This, ...args: any[]) => any ? This extends RollupPluginContext ? This : never : never : never;
};
type RollupPluginHooksContext = GetHookContextMap<RollupPlugin>;
export type RollupPluginHooks = NonNeverKeys<RollupPluginHooksContext>;
export {};
//# sourceMappingURL=typeUtils.d.ts.map