import { type BuildOptions } from 'esbuild';
export declare function buildReactJSX(options?: BuildOptions): Promise<void>;
export declare function buildReact(options?: BuildOptions): Promise<void>;
export declare function buildReactNative(options: BuildOptions | undefined, { platform }: {
    platform: 'ios' | 'android';
}): Promise<void>;
