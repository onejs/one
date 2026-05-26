/**
 * Creates a rolldown DevEngine for native React Native bundle serving.
 * Uses rolldown's experimental dev() API with ESM output.
 *
 * Inspired by rollipop's architecture:
 * https://github.com/leegeunhyeok/rollipop
 */
import type { Plugin } from 'rolldown';
interface NativeDevEngineOptions {
    root: string;
    port: number;
    host?: string;
    platform: 'ios' | 'android';
    serverUrl?: string;
    plugins?: Plugin[];
    onHmrUpdate?: (update: {
        type: string;
        code?: string;
    }) => void;
}
interface NativeDevEngineResult {
    engine: any;
    getBundle: () => Promise<{
        code: string;
        map?: string;
    }>;
    close: () => Promise<void>;
}
export declare function createNativeDevEngine(options: NativeDevEngineOptions): Promise<NativeDevEngineResult>;
interface NativeBuildOptions {
    root: string;
    platform: 'ios' | 'android';
    dev?: boolean;
    serverUrl?: string;
    assetsDest?: string;
    plugins?: Plugin[];
}
export declare function buildNativeBundle(options: NativeBuildOptions): Promise<{
    code: string;
    map?: string;
}>;
export {};
//# sourceMappingURL=createNativeDevEngine.d.ts.map