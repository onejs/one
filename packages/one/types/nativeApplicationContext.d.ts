export interface NativeApplicationContext {
    serverURL: string;
}
/**
 * Activate one native application's server before evaluating its modules.
 * Unmount and stop the application before calling the returned cleanup.
 * Call cleanup on evaluation failure too. Only one context may be active.
 */
export declare function setNativeApplicationContext({ serverURL }: NativeApplicationContext): () => void;
export declare function getNativeApplicationServerURL(): string | undefined;
//# sourceMappingURL=nativeApplicationContext.d.ts.map