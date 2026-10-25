import type { NativeDevBundle } from './createNativeDevEngine';
export declare function resolveNpmHermesc(root: string): string;
export declare function nativeDevBytecodeCompiler(root: string, platform: 'ios' | 'macos'): (bundle: NativeDevBundle, sourceURL: string) => Promise<Buffer>;
//# sourceMappingURL=compileNativeDevBytecode.d.ts.map