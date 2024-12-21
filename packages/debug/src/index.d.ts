import debug from 'debug';
type Debugger = debug.Debugger['log'] & {
    namespace: string;
};
interface DebuggerOptions {
    onlyWhenFocused?: boolean | string;
}
/**
 * This is like `createDebugger()` in the Vite source code ([see](https://github.com/vitejs/vite/blob/v6.0.0-beta.2/packages/vite/src/node/utils.ts#L163)),
 * but some of its features are not supported yet to keeps things simple.
 */
export declare function createDebugger(namespacePartial: string, options?: DebuggerOptions): {
    debug?: Debugger;
    debugDetails?: Debugger;
};
export {};
