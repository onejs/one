import debug from 'debug';
interface DebuggerOptions {
    onlyWhenFocused?: boolean | string;
}
export type VxrnDebugScope = `vxrn:${string}`;
/**
 * This is like `createDebugger()` in the Vite source code ([see](https://github.com/vitejs/vite/blob/v6.0.0-beta.5/packages/vite/src/node/utils.ts#L163)),
 * but some of its features are not supported yet to keeps things simple.
 */
export declare function createDebugger(namespace: VxrnDebugScope | undefined, options?: DebuggerOptions): (debug.Debugger['log'] & {
    namespace: VxrnDebugScope;
}) | undefined;
export {};
//# sourceMappingURL=createDebugger.d.ts.map