/**
 * A frame as React Native's LogBox posts it to /symbolicate, and as it expects
 * one back. `lineNumber` is 1-based and `column` is 0-based, matching both the
 * device's stack parser and the source-map spec.
 */
export type NativeStackFrame = {
    file?: string | null;
    lineNumber?: number | null;
    column?: number | null;
    methodName?: string | null;
    collapse?: boolean;
};
export type NativeCodeFrame = {
    content: string;
    location: {
        row: number;
        column: number;
    };
    fileName: string;
};
export type SymbolicateResult = {
    stack: NativeStackFrame[];
    codeFrame: NativeCodeFrame | null;
};
/**
 * A frame is ours when it points at a JS bundle served over HTTP by this dev
 * server. Every other frame (a native frame, `[native code]`, an HMR eval) is
 * handed back untouched so the client still renders a complete stack.
 */
export declare function isNativeBundleFrame(file: string | null | undefined): boolean;
/**
 * The platform a frame's bundle was built for. React Native always carries it
 * in the bundle URL, and it is what decides which platform's map resolves the
 * frame.
 */
export declare function getNativeFramePlatform(file: string | null | undefined): string | null;
/**
 * Resolve every bundle frame in a React Native stack back to the authored file,
 * line, and column through the bundle's source map.
 *
 * `map` is the serialized map: it is parsed per request rather than kept
 * resident, because a parsed map for a multi-megabyte bundle costs far more
 * memory than a dev server should hold for something only a crash reads.
 */
export declare function symbolicateNativeStack(stack: NativeStackFrame[], map: string): SymbolicateResult;
//# sourceMappingURL=symbolicateNativeStack.d.ts.map