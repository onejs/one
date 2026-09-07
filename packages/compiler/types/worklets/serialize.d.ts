/**
 * Serializes a worklet function into a string for the Hermes UI thread (__initData.code).
 * Includes injected unpacker: `const { var1, var2 } = this.__closure ?? this._closure;`
 * Strips TypeScript types and formats via oxc-transform.
 */
export declare function serializeWorkletForUI(fnNode: any, code: string, name: string | undefined, closureVars: string[]): string;
/**
 * Builds the local JavaScript function to run on the JS thread inside the worklet IIFE.
 * Strips TypeScript types and the 'worklet' directive.
 */
export declare function buildLocalFunction(fnNode: any, code: string, name: string | undefined): string;
//# sourceMappingURL=serialize.d.ts.map